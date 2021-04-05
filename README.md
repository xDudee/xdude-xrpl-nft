# XRP Ledger Non Fungible Token Creator
 - Proof Of Concept NFT token builder for the XRP ledger
 - Not production ready, only an example for demonstration
 - XRP Ledger Testnet only
 - Please feel free to fork this, alter this, go build amazing things :-)

 - Watch Video Demo:  https://www.youtube.com/watch?v=0aNBpp-2R1w


## Build & Run

`npm install`

`node index.js`

 - Ensure you've configured the setup.yml
 - Follow along with the prompts
 - You can use Xumm w/ the QR codes to help add and send funds to your TEST wallets Ref Xumm for setup of Testnet
 - All interactions with the script, including QR codes, are logged to the creation.log file
 - The creation.log may contain secrets used during the build process!
 - You have the option of using IPFS, Pinata Cloud, WebHosting via S3/Spaces, Torrents.
 - The resulting hashes will be added to the XRP wallets Domain field


### input folder
  Place all the content you want to include in your NFT in this directory.
  - These folders will be the templates for your projects build
  - They should contain the following folders/files (See included examples) in your main project folder
   1. content  -> this is all the data you want to package
   2. make.yml -> this is the instructions used to make your package
   3. viewer.html -> this is the html template that's populated during the creation
  
  - I removed the bunny.mp4 from the GitRepo due to size, you can download it here: 
  - I removed the sintel.mp4 from the GitRepo due to size, you can download it here: 

  This index.html file is generated base on the make.yml & view.html files located in your project folder.
  
  It is recommended your view.html file be as generic as possible, as adding to many libraries to your work may not work well in the future.
  
  As an example, browsers which support jQuery x.0.0 may not support jQuery x.0.0 five + years from now.  
  
  The template engine uses nunjucks, and gets its feed from the `config` variable used in the script.
  
  You should preview the index.html file before publishing, and the script allows you to do this, its a built-in step.
  
  - This is also why the generated meta.json file is essential. Any future display tool used to view the NFT can use this data to display the work.
  - If you develop a fantastic template to show off your NFT, please let us see it! Share on Twitter and please tag me. I would love to see it!


### ouput folder
  Your generated content will be located in this folder.
  Some important notes here:
  1.  You will need to seed the Torrent.  It is assumed your using IPFS as your primary seeding source.  If you don't want to do this, you can remove the torrent file from the output directory and re-create your torrent file based on the contents of the folder.  The hash SHOULD be exactly the same despite keeping it compatible.
  2.  If you need to re-populate IPFS with your data, remove the .torrent file from the output directory.  Then proceed to add the entire built folder into IPFS.  The hash SHOULD be the exactly the same despite, keeping it compatible.
  3.  If you want to use WebTorrents, you NEED to seed the Torrent via a compatible WRTC enabled client, like WebTorrent Desktop client.  You can validate the WebTorrent is working by placing the magnet url into https://instant.io to validate.
  4.  Using an external pinning service will greatly improve the performance of the availability of your content, its up to you to ensure your content is as available as possible.
  5.  I recommend the use of Digital Ocean spaces to helping ensure your content is easily accessible.
  6.  On first creation, your content may take some time to propagate!



### make.yml and setup.yml files
  The make.yml and setup.yml files are well documented with comments.
  
  Please validate all the settings in the yml files before generating your content.
  
  The script will ask you multiple times to validate your given settings.

  - make.yml is located in your project folder, specifically for that given project build
  - setup.yml is located in the main script folder, used for all builds


### make.yml
 - settings.contentFolder : the folder in the project folder you want to package (default of 'content')
 - settings.templateFile : the file you want to use as an HTML template to build viewer of the NFT content (default viewer.html)
 - settings.tempateHtmlEscape : should we escape any html found in the configuration file? (default false)
 - settings.makeTorrent : should we create a .torrent package from the content?  (default true)
 - settings.useIPFSWebSeed : if we build a torrent file, should we include IPFS webseeds? (default true) 

 - settings.meta.webHostingURI : this is the BASE url all your nft content will be located at: ex https://nft.xrpfs.com/buckbunny1617650420008/ is the contents of your hosted nft, and https://nft.xrpfs.com/ is the base


 - settings.meta.honorDynamicILPAddress : this tells the viewer of the meta to honor the ILP address in the XRP wallet Domain field IF found over the preset ILP value IF given.


 - settings.meta.staticILPAddress : this is the payment pointer given during the build, that is included in the html viewer page.  Viewing of content should honor this value, unless otherwise stated.

 - settings.meta.author {} : infomation about the author.
 - settings.meta.details {} : information on the packaged content.


### setup.yml
 - webbucket
    Allows user to upload NFT content to the online storage system (Amazon S3 / DigitalOcean Spaces)

    timeout : how long to wait before timeout of connection.  (default 10 minutes)

    disableSyncUpload: if you have a large file, the script will wait for the content to upload to ensure it completes before the end of the script.  If the file(s) are large, this can take some time.  You can make this activity async by disabling it.  (default false)

 -  pinatacloud
    Allows user to pin hash on creation to Pinata Cloud.  This can take some time to propagate, so I recommend local pinning to IPFS desktop to ensure remote pinning completes.

- system
    Generic system-related things.  At this point allows you to exit the script after a set period.
    Enabled by default to exitEnabled: true and will exit after 30 minutes


### meta.json
  The meta.json file contains details linking the IPFS file contents to the NFT wallet and the creators/artists wallet.
  
  This is generated during the build process and is re-built during each run.
  
  Example output:
  ```json
{
    "webHostingURI": "nft.xrpfs.com",
    "honorDynamicILPAddress": true,
    "staticILPAddress": "$ilp.uphold.com/ZQ9a44qFAxLk",
    "author": {
        "wallet": "X7ART2fww9nxR1xWxM9WjQzY3j3C7eVaquLorx4aMio6UL8",
        "name": "Calvin",
        "email": "calvin [@] example [.] com",
        "twitter": "@calcs9 ",
        "website": "http://some.example.com/",
        "payId": "example$example.com",
        "bio": "Autodidact, driven by possibilities, passionate about Technology, Security, Personal Finance, Blockchain, Real Estate, Science\nDev: Python,JS,Go,Rust,Java,etc\nFind me on Twitter @calcs9"
    },
    "details": {
        "title": "Big Buck Bunny",
        "description": "When Big Bucks day gets turned upside down by the loss of his favorite butterflies via some rotten rodents, he takes to the offensive to avenge his friends. This is a short animated, comedic, and light-hearted movie that has stood the test of time.\nCode-named \"Project Peach\" by the Blender Institute, the film was made using a free and open-source software application called Blender.\n\nThis short film was released in 2008 under the Creative Commons Attribution 3.0 license.\n\nThis NFT is a distribution of that original work.  By releasing this work as an NFT, I hope to accomplish the following:\n1) Preserve the work of this media on a decentralized platform\n2) Bring awareness to XRPs ability to create NFTs on the ledger easily and efficiently\n3) Show the benefits of having an XRP wallet as the NFT vs a \"token\"\n4) Raise money for some great open source projects/foundations\n\nClick the above floating BigBuckBunny to watch a short film if you have an IPFS enabled browser.",
        "cover": "bunny.png",
        "link": "bunny.mp4",
        "legal": "The works contained in this package are protected by U.S. and International copyright laws\nCreative Commons Attribution 3.0 license\n(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org",
        "NFTWalletAddress": "rPu3t9CND35sm2waACwKhABtAZhr9g3KW8",
        "NFTWalletXAddress": "XVkwcJoq3RzAP6jcNr6krmPJCHgTWjA4C4BZ4PmeQk7uN4p"
    },
    "hashes": [
        {
            "file": "/buckbunny1617650420008/bunny.mp4",
            "cid": "QmNT6isqrhH6LZWg8NeXQYTD9wPjJo2BHHzyezpf9BdHbD",
            "sha256": "20b80994904d40acbf6224024097a2ce5a1ea7130478e57162a38af1b876dfce"
        },
        {
            "file": "/buckbunny1617650420008/bunny.png",
            "cid": "QmRe6bYHv4XtsA8oXJeNSY6NqmDYa9Q3JBhUtZCEAC6yDQ",
            "sha256": "7ef51475fe83169530a16403a9941afde156fc87aa058a8500131a23de600f9a"
        }
    ],
    "created": 1617650420008,
    "framework": "https://github.com/calvincs/xrpl-nft-creator"
}
  ```


#### Why use an XRP wallet?
 Here are a few reasons I believe XRP wallets are an excellent choice for NFTs

 - Multiple people can control/own a single asset via MultiSign
 - Wallets can be easily transferred between users by updating the Regular Signers Key
 - Adding a pointer from the XRP wallet to a decentralized data store aka IPFS is straight forward
 - XRP + IPFS allows an easily traceable path of ownership of an NFT and the original creator/artist
 - While a Wallet does require a 20 XRP funding minimum, future TXs are relatively inexpensive as compared to some other solutions
 - Having access to the Wallet allows for exciting features that are difficult to implement in a Token alone.
    - Some examples:
        Wallets can sign data
        
        Wallets can receive and send payments.
        
        Wallets using Xumm can authenticate to other services ;-)
        
        Hooks?
        
        Xmpl.Cloud?
        
 ### Contact
 Twitter calcs9

 # Enjoy