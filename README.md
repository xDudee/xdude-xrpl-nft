# XRP Ledger Non Fungible Token Creator
 - Proof Of Concept NFT token builder for the XRP ledger
 - Not production ready, only an example for demonstration
 - XRP Ledger Testnet only
 - Please feel free to fork this, alter this, go build amazing things :-)


## Build & Run

`npm install`

`node index.js`

 - Ensure you've configured the setup.yml
 - 
 - Follow along with the prompts
 - 
 - You can use Xumm w/ the QR codes to help add and send funds to your TEST wallets Ref Xumm for setup of Testnet
 - 
 - All interactions with the script, including QR codes are logged to the creation.log file
 - 

### nft-content folder
  Place all the content you want to include in your NFT in this directory.  
  
  All the contents will be packaged up and deployed over IPFS for you. 
  
  The resulting CIDv1 hash will be added to the XRP wallet you designate it to as well.
  

  - I removed the BigBuckBunny.mp4 from the GitRepo due to size, you can download it here: https://ipfs.io/ipfs/bafybeiccp7ikixrum3kizkbezqtvl4fylomiihdtg4pm2wyhojhsp3wdgu/BigBuckBunny.mp4


### template folder
  The script attempts to make a index.html file which is placed in the nft-content folder for you during build.
  
  This index.html file is generated base on the setup.yml configuration.
  
  You can have multiple templates in the directory, and update the setup.yml to use the template which best displays your content.
  
  It is recommended your index.html file be as generic as possible, as adding to many libraries to your work may not work well in the future.
  
  As an example, browsers which support jQuery x.0.0 may not support jQuery x.0.0 five + years from now.  
  
  The template engine uses nunjucks, and gets its feed from the `config` variable used in the script.
  
  You should preview the index.html file before publishing, the script allows you to do this, its a built in step.
  

  - This is also why the generated meta.json file is important. Any future display tool used to view the NFT can use this data as well to display the work.
  - If you develope an amazin template to show off your NFT, please let us see it! Share on twitter and please tag me, would love to see it!

### setup.yml
  The setup.yml file is well documented with comments
  
  Please validate all the settings in the setup.yml file before generating your content
  
  The script will ask you multiple times to validate your given settings
    
 - Leaving some fields blank will result in the script asking you for said data, but best practice would be to pre-define said values


### meta.json
  The meta.json file contains details linking the IPFS file contents to the NFT wallet and the creators/artists wallet.
  
  This is generated during the build process, and is re-built during each run.
  
  Example output:
  ```json
        {
            "author": {
                "wallet": "X7ART2fww9nxR1xWxM9WjQzY3j3C7eVaquLorx4aMio6UL8",
                "name": "Calvin Schultz",
                "email": "calvin@ventibean.com",
                "twitter": "@calcs9 \n@CloudXmpl",
                "website": "http://xmpl.cloud/",
                "bio": "Autodidact, driven by possibilities, passionate about Technology, Security, Personal Finance, Blockchain, Real Estate, Science\nDev: Python,JS,Go,Rust,Java,etc\nFind me on Twitter @calcs9 or @CloudXmpl"
            },
            "details": {
                "title": "Big Buck Bunny",
                "description": "When Big Bucks day gets turned upside down by the loss of his favorite butterflies via some rotten rodents, he takes to the offensive to avenge his friends. This is a short animated, comedic, and light-hearted movie that has stood the test of time.\nCode-named \"Project Peach\" by the Blender Institute, the film was made using a free and open-source software application called Blender.\n\nThis short film was released in 2008 under the Creative Commons Attribution 3.0 license.\n\nThis NFT is a distribution of that original work.  By releasing this work as an NFT, It's my hope to accomplish the following:\n1) Preserve the work of this media on a decentralized platform\n2) Bring awareness to XRPs ability to create NFTs on the ledger easily and efficiently\n3) Show the benefits of having an XRP wallet as the NFT vs a \"token\"\n4) Raise money for some great open source projects/foundations\n\nClick the above floating BigBuckBunny to watch short film if you have an IPFS enabled browser.",
                "cover": "bunny.png",
                "link": "BigBuckBunny.mp4",
                "legal": "The works contained in this package are protected by U.S. and International copyright laws\nCreative Commons Attribution 3.0 license\n(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org",
                "NFTWalletAddress": "rNtm6FCQDBBjRTcdTeBFXoDr4BPSgpE34M",
                "NFTWalletXAddress": "XVNFT2byUWwpzimqh1LjN2RcrYBNbymJEChnuSrE1n4n8jH"
            },
            "hashes": [
                {
                    "file": "/nft-content/BigBuckBunny.mp4",
                    "cid": "QmNT6isqrhH6LZWg8NeXQYTD9wPjJo2BHHzyezpf9BdHbD",
                    "sha256": "20b80994904d40acbf6224024097a2ce5a1ea7130478e57162a38af1b876dfce"
                },
                {
                    "file": "/nft-content/bunny.png",
                    "cid": "QmRe6bYHv4XtsA8oXJeNSY6NqmDYa9Q3JBhUtZCEAC6yDQ",
                    "sha256": "7ef51475fe83169530a16403a9941afde156fc87aa058a8500131a23de600f9a"
                },
                {
                    "file": "/nft-content/butterfly.gif",
                    "cid": "Qma7AZJGSeDPezaK2qqej4EiYuptSTjvnAziriwaauAXf7",
                    "sha256": "110b30dfa67ae6668a335240b12362a42aeceafb374bf8617816e8a13ff12ffc"
                }
            ],
            "created": 1615926994199,
            "framework": "https://github.com/calvincs/xrpl-nft-creator"
        }

  ```

#### Why use an XRP wallet?
 Here are a few reasons I believe XRP wallets are a great choice for NFTs

 - Multiple people can control/own a single asset via MultiSign
 - Wallets can be easily transferred between users by updating the Regular Signers Key
 - Adding a pointer from the XRP wallet to a decentralized data store aka IPFS is straight forward
 - XRP + IPFS allows an easily traceable path of ownership of an NTF and the original creator/artist
 - While a Wallet does require a 20 XRP funding minimum, future TXs are relatively inexpensive as compared to some other solutions
 - Having access to the Wallet allows for exciting features that are difficult to implement in a Token alone.
    - Some examples:
        Wallets can sign data
        
        Wallets can receive and send payments
        
        Wallets using Xumm can authenticate to other services ;-)
        
        Hooks?
        
        Xmpl.Cloud?
        


#### Example living on the XRP Ledger MainNet
 - NFT Address: XVNFT2byUWwpzimqh1LjN2RcrYBNbymJEChnuSrE1n4n8jH
 - IPFS ipfs://bafybeiccp7ikixrum3kizkbezqtvl4fylomiihdtg4pm2wyhojhsp3wdgu/meta.json


 ### Contact
 Twitter calcs9

 # Enjoy
