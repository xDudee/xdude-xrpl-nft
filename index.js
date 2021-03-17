`use strict`

const fileSys = require('fs');
const path = require('path')
const Yaml = require('js-yaml');
const logs = require('./log');
const prompt = require('prompt-sync')({sigint: true});
const crypto = require('crypto');
const RippleAPI = require('ripple-lib').RippleAPI;
const { create, globSource } = require('ipfs-core');
const nunjucks = require('nunjucks');
const open = require('open');
const xAddr = require('xrpl-tagged-address-codec')
const Hash = require('ipfs-only-hash')
const qrcode = require('qrcode-terminal');


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
qrcode.setErrorLevel('H');

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
    prompt('something went wrong, press Enter to exit script...')
    process.exit()
  }

// clean the working nft-content directory from previous runs
async function CleanNftDirectory() {
  try {
    logs.info(`clearing any old generated files from ${config.settings.contentPath}`);
    let metaFile = `${config.settings.contentPath}${path.sep}meta.json`;
    let htmlFile = `${config.settings.contentPath}${path.sep}index.html`;
    // clean out any file that maybe left over from previous runs (index.html | meta.json)
    const cleanFiles = [metaFile,htmlFile];
    await Promise.all(cleanFiles.map(async (file) => {
          logs.info(`found old file ${file}, attempting removal`)
          fileSys.unlinkSync(file);
    }));
  } catch (error) {
    if (!error.code === "ENOENT") {
      CatchError(error)
    }
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
                    await xAPI.getSettings(walletAddress);
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
                            break
                    }
                }
            }, 10000); //Will check every 10 seconds
        });
    } catch (error) {
      CatchError(error)
    }
  }

//Push nft-content files, returns root cid
async function PushNFTFiles() {
    try {
        logs.info(`if your pushing a large NFT over a slow connection, this may take some time...`)
        //options specific to globSource
        const globSourceOptions = { recursive: true };
        
        //example options to pass to IPFS
        const addOptions = {
            pin: true,
            wrapWithDirectory: true,
            cidVersion: 1,
            timeout: 300000
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

//Fetch nft-content files cids, returns cids for nft-content files
//Also gathers SHA256 for each file
async function GetNFTFileHashes() {
  try {
      logs.info(`gathering IPFS CID & SHA256 hashes to add to meta data file...`)
      //options specific to globSource
      const globSourceOptions = { recursive: true };
      
      let cids = [];
      for await (let value of globSource('nft-content', globSourceOptions)) {
        if (value.path != "/nft-content") {
          let fileData = await fileSys.readFileSync(value.content.path);
          const cid = await Hash.of(fileData);
          console.log(JSON.stringify(cid))
          const hash = crypto.createHash('sha256');
          hash.update(fileData);
          const hdigest = hash.digest('hex');
          cids.push({'file':value.path, 'cid': cid, 'sha256': hdigest})
          logs.info(`adding '${value.path}' with cid hash '${hdigest}' to meta data...`)
        }
      }
      return cids
  } catch (error) {
      CatchError(error)
  }
}

//Generate and write index.html file to nft-content folder
async function WriteIndexHtml() {
  try {
      logs.info(`generating index.html file...`)
      nunjucks.configure({ autoescape: config.settings.tempateHtmlEscape });
      let templatePath = config.settings.templatePath + path.sep + "index.html"
      console.log(templatePath)
      let contentPath = config.settings.contentPath + path.sep + "index.html"
      let htmlPage = await nunjucks.render(templatePath, config);
      fileSys.writeFileSync(contentPath, htmlPage);
      logs.info(`index.html file generated: ${contentPath}`)
      return contentPath
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

// - Main execution block for script
async function main() {
    try {
        // Init IPFS
        iAPI = await create({ repo: config.ipfs.repopath });
        // Clean nft-content folder before run
        await CleanNftDirectory()

        // Statements to end user on usage of script
        logs.warn("DO NOT USE THIS IN PRODUCTION, THIS IS A Proof Of Concept")
        logs.warn("Use the XRP TestNet for testing\n\n")
        logs.warn("You can get a XRP Test account here: https://xrpl.org/xrp-testnet-faucet.html")
        prompt("By pressing enter, you agree and understand this is a Proof of Concept, and SHOULD NOT be used for production for any reason!")
        logs.info(`Current setup.yml values:\n${JSON.stringify(config.settings.meta, null, 4)}\n`)
        prompt("Please ensure you filled in the correct details for this NFT in the setup.yml file\nPress Return to continue or Ctrl+C if you need to exit")

        // Ask questions about the contents, meta data, etc if blank
        if (!config.settings.meta.details.title) {
          config.settings.meta.details.title = prompt("What is the title of this NF Token: ")
        }
        if (!config.settings.meta.details.description) {
          config.settings.meta.details.description = prompt("Description of the work contained in the NF Token: ")
        }
        if (!config.settings.meta.details.cover) {
          config.settings.meta.details.cover = prompt("Name of the cover photo you want to use, should be in the nft-content folder\nExample: cover.png")
        }
        if (!config.settings.meta.details.legal) {
          config.settings.meta.details.legal = prompt("Provide any legal usage rights you want to provide with this NFT.")
        }

        // Get additional meta of nft-content folder contents
        // - Content IDentifiers for IPFS and SHA256 values for files
        config.settings.meta.hashes = await GetNFTFileHashes()

        // Setup a new XRP wallet ( MUST BE PRE-FUNDED w/ 21 xrp )
        // Starts the XRP Ledger API interface
        logs.info(`Init connection to xrp ledger: ${JSON.stringify(config.xrp.network, null, 4)}`);
        await xAPI.connect();

        // Generate NFT wallet address to be funded by author address
        // - (options) Use existing address seed OR create a new wallet address
        let address = {};
        let secret;
        let validAcc = false;
        do {
          let resp = prompt("Would you like to supply your own account seed? Ex: snfFLJ95fJr3e.... [ y/n ] ")
          switch(resp){
            case "y":
              secret = prompt("please enter your secret: ")
              if (await xAPI.isValidSecret(secret)) {
                let tempAddr = await xAPI.deriveKeypair(secret);
                address.address = await xAPI.deriveAddress(tempAddr.publicKey)
                address.xAddress = await xAddr.Encode({ account: address.address})
                address.secret = secret
                logs.info(`account secret appears valid: '${secret}'`)
                validAcc = true;
                break
              } else {
                logs.warn(`the provided secret was not valid, please try again: '${secret}'`)
                break
              }
            case "n":
                logs.info(`generating a new wallet address...`)
                address = await xAPI.generateAddress();
                validAcc = true;
                break
            default:
              logs.warn(`invalid option given: '${resp}' use Ctrl+C to exit if required, otherwise try again...`)
              break
          }
        } while(!validAcc);

        // Display the account for the user
        logs.info(`NFT Wallet Address: (Classic)  '${address.address}'`)
        qrcode.generate(address.address, {small: true}, function(qrcode){
          logs.warn(`Classic Address QR Code\n${qrcode}\n\n\n`)
        });
        logs.info(`NFT Wallet Address: (XAddress) '${address.xAddress}'`)
        qrcode.generate(address.xAddress, {small: true}, function(qrcode){
          logs.warn(`X Address QR Code\n${qrcode}\n\n\n`)
        });
        logs.warn(`NFT Wallet Secret:  ${address.secret}  <-- This is logged, so please take care to remove it after`);
        qrcode.generate(address.address, {small: true}, function(qrcode){
          logs.warn(`Address Secret QR Code\n${qrcode}\n\n\n`)
        });
        // Add the public wallet address to the meta data
        config.settings.meta.details.NFTWalletAddress = address.address.toString()
        config.settings.meta.details.NFTWalletXAddress = address.xAddress.toString()

        // - Write Meta data to nft-content folder for IPFS packaging
        config.settings.meta.created = new Date().getTime();
        config.settings.meta.framework = "https://github.com/calvincs/xrpl-nft-creator";
        await WriteMetaData(config.settings.meta);

        // Render the index.html file, found in the template folder.
        // - customize the index.html file for each of your NFTs if you like, otherwise use a default template setup
        let indexFilePath = await WriteIndexHtml();
        let preview;
        do {
          let resp = prompt("Would you like to preview the NFT index.html page [ y/n ] ")
          switch(resp){
            case "y":
              // attempts to launch users browser, best if user has Brave Browser
              await open(indexFilePath)
              preview = true
              break
            case "n":
                preview = true
                break
            default:
              logs.warn(`invalid option given: '${resp}' use Ctrl+C to exit if required, otherwise try again...`)
              break
          }
        } while (!preview);

        // - Before they fund, validate the data
        logs.warn(`PLEASE VALIDATE DATA BEFORE FUNDING`)
        logs.warn(`\n${JSON.stringify(config.settings.meta, null, 2)}\n`)
        let validation = false;
        do {
          let resp = prompt("Does the information look correct? [ y/n ] ")
          switch(resp){
            case "y":
              logs.info('User validated information, ready for NFT funding...')
              validation = true;
              break
            case "n":
                logs.warn(`User stated information is incorrect, exiting script`)
                process.exit(0)
                break // - wont be used, but you know, eslint things.. 
            default:
              logs.warn(`invalid option given: '${resp}' use Ctrl+C to exit if required, otherwise try again...`)
              break
          }
        } while(!validation)

        // You MUST FUND THE NEW ADDRESS NOW for this to work
        logs.warn(`YOU MUST FUND THE NFT ADDRESS w/ 21 XRP (CLASSIC): '${address.address.toString()}' (XADDRESS): '${address.xAddress.toString()}'`)

        // Validate the above address is funded...
        logs.info(`Waiting for wallet funding to complete, will check every 10 seconds till validated...`)
        await ValidateFunding(address.address)
        logs.warn(`validation completed, wallet ${address.address} is funded`)

        // Now that the wallet is funded, lets bundle up the files in IPFS
        // - Push nft-content files to IPFS w/ PIN, get CID value
        let online = await iAPI.isOnline();
        logs.info(`IPFS Online status: ${online}`);

        let rootCID = await PushNFTFiles();
        let rootString = rootCID.cid.toString();
        let rootStringURL = `ipfs://${rootString}/`;
        logs.info(`nft-content root string recorded as: ${rootStringURL}`);
        
        //Get string ready for XRPL Wallet Domain Field
        let xrpDomainField = new Buffer.from(rootStringURL).toString('hex').toUpperCase();
        logs.info(`Attempting to set ${address.address} Domain field to IPFS address of ${rootStringURL}`)

        // Write the data to the NFT Wallet
        await updateXRPWalletData({"Domain": xrpDomainField}, address)

        // You should pin this remotely, display some messages for user
        logs.info("Content is best viewed with an IPFS enabled browser, like Brave Browser: https://brave.com/")
        logs.info(`Validate your NFT data is live: ${rootStringURL}`)
        logs.info(`Validate your NFT data is live: https://gateway.ipfs.io/ipfs/${rootString} `)
        logs.info(`Validate your NFT data is live: https://ipfs.io/ipfs/${rootString} `)
        logs.warn('Your data is being served from this temp IPFS node, you should PIN this NFT externally for long term distribution')
        logs.warn('Pinning Service: https://pinata.cloud/ Or run your own IPFS node: https://ipfs.io/')
        logs.info(`See your Testnet NFT wallet here: https://testnet.xrpl.org/accounts/${address.address}`)
        logs.warn(`Remember this activity was all logged to xrpl-nft-creator.log, and contains your secrets during this creation session!`)
        logs.info("...")

        logs.warn('This node application will end in 10 minutes. This will stop the IPFS node and close the XRP ledger connection')
        logs.warn('Use Ctrl+C to end the program sooner, this will halt hosting of your local NFT token data')
        logs.info('Will show IPFS swarm data every 30 seconds till script ends')

        // Show number of swarm peers for IPFS
        let peerHealthCheck = setInterval(async () => {
          try {
              if (iAPI.isOnline() == false) {
                  clearInterval(peerHealthCheck);
                  logs.info('ipfs node is no longer online, stopping peer health check')
              } else {
                  const peers = await iAPI.swarm.peers()
                  logs.debug(`this IPFS node now has ${peers.length} swarm peers...`)
              }
          } catch (error) {
              CatchError('An error occurred trying to check our peer counts:', error)
          }
      }, 30000); //Every 30 seconds, check swarm count

        //Final Disconnect after wait... 
        setTimeout(async function(){
            logs.info('Time to close things down...')
            await xAPI.disconnect()
            await iAPI.stop();
            process.exit()
        }, 600000);

    } catch (error) {
        CatchError(error)
        process.exit(-1)
    }
}

main()

