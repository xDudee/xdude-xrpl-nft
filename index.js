`use strict`

const fileSys = require('fs');
const path = require('path')
const Yaml = require('js-yaml');
const logs = require('./log');
const prompt = require('prompt-sync')({sigint: true});
const { hashElement } = require('folder-hash');
const RippleAPI = require('ripple-lib').RippleAPI;
const winston = require('winston/lib/winston/config');
const { create, globSource } = require('ipfs-core');


// Pull in configuration options - setup.yml
let config;
try {
  config = Yaml.load(fileSys.readFileSync('setup.yml', 'utf8'));
} catch (error) {
  // Dies hard this way.. This is a major issue we just fail outright on
  console.log(`Error in index.js: ${error}`);
  process.exit(-1);
}


// Global Things
const xAPI = new RippleAPI({ server: config.xrp.network });
let iAPI;


// catch and display the errors nicely
function CatchError(err) {
    if (typeof err === 'object') {
      if (err.message) {
        logs.error(err.message)
      }
      if (err.stack) {
        logs.error('StackTrace:')
        logs.error(err.stack);
      }
    } else {
      logs.error('error in CatchError:: argument is not an object');
    }
  }


// write JSON to System State file
async function WriteMetaData(data) {
    try {
      logs.info(`writting data to meta file to ${config.settings.contentPath}`);
      let metaFile = `${config.settings.contentPath}${path.sep}meta.json`;
      fileSys.writeFileSync(metaFile, JSON.stringify(data, null, 4));
    } catch (error) {
      CatchError(error)
    }
  }


// write JSON to System State file
async function ValidateFunding(walletAddress) {
    try {
        return new Promise((resolve, reject) => {
            let walletFundedChecking = setInterval(async () => {
                try {
                    let testAddr = "rfHmFePnp6P4sQV2g9L8cC6CZv1UNLScqy"
                    let resp = await xAPI.getSettings(walletAddress);
                    logs.info(`validating ${walletAddress} is funded...`)
                    clearInterval(walletFundedChecking);
                    resolve()
                } catch (error) {
                    switch(error.data.error){
                        case "NotConnectedError":
                            logs.warn(`reconnecting to XRP Ledger...`);
                            xAPI.connect();
                            break

                        case "actNotFound":
                            logs.debug(`account validation waiting, last check results: ${error.data.error}`)
                            break;

                        default:
                            logs.warn(`encountered error during validation of wallet funding: ${JSON.stringify(error, null, 2)}`)
                            reject()
                    }
                }
            }, 5000);
        });
    } catch (error) {
      CatchError(error)
    }
  }


//Push nft-content files, returns root cid
async function PushNFTFiles() {
    try {
        //options specific to globSource
        const globSourceOptions = { recursive: true };
        
        //example options to pass to IPFS
        const addOptions = {
            pin: true,
            wrapWithDirectory: true,
            cidVersion: 1,
            timeout: 10000
        };
        let rootCID = "";
        for await (const file of iAPI.addAll(globSource('nft-content', globSourceOptions), addOptions)) {
            logs.info(`pushing nft-content files: ${file.path} :: ${file.size} :: ${file.cid}`);
            if (file.path == "nft-content"){
                rootCID = file;
            }
        }
        return rootCID
    } catch (error) {
        CatchError(error)
    }
}


//Update xrp wallet data
async function updateXRPWalletData(walletData, walletAddress) {
    try {
        //Get some account info
        // - Fee calculation
        let fee = await xAPI.getFee();
        fee = (parseFloat(fee) * 1000000).toFixed(0) + "";
        // Seq calculation
        let accInfo = await xAPI.getAccountInfo(walletAddress.address);
        let seqNum = accInfo.sequence;

        // TX Template for update
        let tempWalletData = {
            "TransactionType": "AccountSet",
            "Account" : walletAddress.address,
            "Fee": fee,
            "Sequence": seqNum,
            "SetFlag": 5
        }

        //Merge options with template
        let txWallet = {...tempWalletData, ...walletData};

        //Prepare TX for sending to ledger
        let txJSON = JSON.stringify(txWallet);
        let signedTX = xAPI.sign(txJSON, walletAddress.secret);

        //Submit the signed transaction to the ledger (need to add validation here)
        await xAPI.submit(signedTX.signedTransaction).then(function(tx){
            logs.debug(`attempting submition of transaction: ${txJSON}`);
            logs.debug(`tentative message: ${tx.resultMessage}`);
            logs.info(`tx status code: ${tx.resultCode} , tx hash ${tx.tx_json.hash}`);
          }).catch(function(e){
            logs.warn(`tran failure to send data: ${e}`);
          });
    } catch (error) {
        CatchError(error)
    }
}


async function main() {
    try {
        // Init IPFS
        iAPI = await create({ repo: config.ipfs.repopath });

        logs.warn("DO NOT USE THIS IN PRODUCTION, THIS IS A Proof Of Concept")
        logs.warn("Use the XRP TestNet for testing\n\n")

        // Ask questions about the contents, meta data
        config.meta.name = prompt("What is the name of this NF Token: ")
        config.meta.description = prompt("Description of the work contained in the NF Token: ")

        //Get additional meta of nft-content folder contents
        config.meta.contents = await hashElement(config.settings.contentPath, {algo: "sha256", encoding: "hex"})
        
        // Generate a new XRP wallet, give address to the user for funding ( MUST BE PRE-FUNDED w/ 21 xrp )
        // Starts the XRP Ledger API interface
        logs.info(`Init connection to xrp ledger: ${JSON.stringify(config.xrp.network, null, 4)}`);
        let output = await xAPI.connect();

        // Generate NFT wallet address to be funded by author address
        const address = xAPI.generateAddress();
        logs.info(`NFT Wallet Address: ${address.address}`);
        logs.info(`NFT Wallet Secret: ${address.secret}`);

        // Add the public wallet address to the meta data
        config.meta.NFTWalletAddress = address.address.toString()

        // You MUST FUND THE NEW ADDRESS NOW for this to work
        logs.warn(`YOU MUST FUND THE NFT ADDRESS NOW (CLASSIC): ${address.address.toString()}`)
        logs.warn(`YOU MUST FUND THE NFT ADDRESS NOW (XADDRESS): ${address.xAddress.toString()}`)

        // Validate the above address is funded...
        logs.info(`Waiting for wallet funding to complete...`)
        await ValidateFunding(address.address)
        logs.warn(`validation completed, wallet ${address.address} is funded`)

        //Now that the wallet is funded, lets bundle up the files in IPFS
        // - Write Meta data to nft-content folder for IPFS wrap up
        config.meta.framework = "https://github.com/calvincs/xrpl-nft-creater";
        await WriteMetaData(config.meta);

        // - Push nft-content files to IPFS w/ PIN, get CID value
        let online = await iAPI.isOnline();
        logs.info(`IPFS Online status: ${online}`);

        let rootCID = await PushNFTFiles();
        let rootString = rootCID.cid.toString();
        logs.info(`nft-content root string recorded as: ${rootString}`);

        //Get string ready for XRPL Wallet Domain Field
        let xrpDomainField = new Buffer.from(rootString).toString('hex').toUpperCase();
        logs.info(`Attempting to set ${address.address} Domain field to IPFS address`)

        // Write the data to the NFT Wallet
        await updateXRPWalletData({"Domain": xrpDomainField}, address)

        // You should pin this remotely, display some messages for user
        logs.info(`Validate your NFT data is live: https://gateway.ipfs.io/ipfs/${rootString} `)
        logs.info(`Validate your NFT data is live: https://cloudflare-ipfs.com/ipfs/${rootString} `)
        logs.warn('Your data is being served from this temp IPFS node, you should PIN this NFT externally for long term distribution')
        logs.info("...")
        logs.warn('Pinning Service: https://pinata.cloud/  (no affiliation), or run your own IPFS node: https://ipfs.io/')
        logs.info(`See your testnet NFT wallet here: https://testnet.xrpl.org/accounts/${address.address}`)
        logs.info("...")

        logs.warn('This node application will end in 10 minutes, and stop the IPFS node and close the XRP ledger connection')
        logs.warn('Use Ctrl+C to end the program sooner, this will halt hosting of your local NFT token data')


        
        // Ideally the Author wallet will fund the NFT wallet to show a connection to the author as well
        // Generate IPFS data containting the NFT data
        // Push the data to the wallet, populate the wallet domain field w/ IPFS id of content.

        //User can now publish the IPFS content if they choose, as well, can give the wallet to another person for trade.
        //The joining of the XRPL wallet address with the hash of the IPFS contents establishes ownership and control
        //The ability of the author to link an origin account with the new wallet also establishes authoriship
        //The author can publish an entire collection and have the original attribution to themselves.
        //The owner can also delete the wallet, giving the NFT public ownership vs private ownership. 

        // I wrote this in 45 minutes.. so hold judgment :-P  Enjoy...

        //Final Disconnect after wait... 
        setTimeout(async function(){
            logs.info('Time to close things down...')
            xAPI.disconnect()
            iAPI.stop();
        }, 600000);

    } catch (error) {
        CatchError(error)
        process.exit(-1)
    }
}

main()

