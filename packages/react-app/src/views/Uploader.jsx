import { Upload, message, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import  { WalletService } from '@unlock-protocol/unlock-js';

import {encrypt as ethSigEncrypt} from 'eth-sig-util';

import { ethers, utils } from "ethers";
import { Buffer } from 'buffer';
import React, { useEffect, useState } from "react";
import { Address, AddressInput } from "../components";
import { useTokenList } from "../hooks";
import {  Buckets, encrypt } from '@textile/hub';
const auth = {
  key: 'b3xj7rjlhffdpc42lzz7slden4a',
  secret: 'bvyxyvavrpsili77jufjyyffxqba6nc2mhv5gv6y'
}

/*
1. File encrypt and upload - file object => encryptionKey, encryptionIv, encryptedData 
2. Key encrypt and upload - (key, metadata) =>  textileAddress
3. Publish Post - (name, ipfs url) => postId
4. Fetch all clubs - () => [clubs]
5. Fetch all members of a club - lockAddress => [members(address,pubkey)]
6. Fetch posts of a club - (lockAddress) => [posts]
7. Subscribe to a club - (lockAddress) => keyId
8. Create a new club - (lockName, price, totalMemberships = 100) => lockAddress
9. Fetch all clubs of a member - (address of member) => [clubs]
10. Fetch a file from textile -> (filePath) => Buffer
*/


export default function Uploader({
  provider,
  signer
}) {
    const [buckets, setBucket] = useState();
    const [fileToUpload, setFile] = useState();
    const [pt, spt] = useState('untested');
    const [walletService, setWalletService] = useState();

    useEffect(() => {
      async function initBucket(){
        const buck = await Buckets.withKeyInfo(auth, {debug:true})
        await buck.withThread("bafkzubtwkd4qhlodrzjwvsw6wbfhpugtxbkr33txn7fcqsii233tshi");
        setBucket(buck);
      }
      initBucket();
      
    },[]);

    useEffect(() => {
      async function initWC(){
        const wc = new WalletService({'1337': {provider: 'http://127.0.0.1:7545', unlockAddress: '0xEfA9768d29AbE06AD0aa8c632736BEff39A41e1D'}});
        await wc.connect(provider);
        console.log(wc);
        setWalletService(wc);
      }
      initWC();
    },[]);


    const handleUpload = async () => {
      const fileBuffer = await fileToUpload.arrayBuffer();
      console.log('HANDLE UPLOAD RAW', fileToUpload.name);
      const raw = await buckets.pushPath('bafzbeibbklbg5ab4j7kwzk3jvc7h5k644hkdc6f6f26o73qh4g7plqudsm', fileToUpload.name, {
        path: fileToUpload.name,
        content: fileBuffer
      });
      console.log('HANDLE UPLOAD RAW', raw);
     };

     const handleEncryptedUpload = async () => {
      const fileBuffer = await fileToUpload.arrayBuffer();
      const encryptedBuffer = await encryptBuffer(fileBuffer);
      const uploadedStatus  = await uploadToTextile(encryptedBuffer.encryptedData,'encryptedFile');
      console.log('HANLDE UPLOAD ENC', uploadedStatus);
      return uploadedStatus;
     }
     

    const uploadProps = {
      name: 'file',
      beforeUpload: function(file) {
        setFile(file);
        return false;
      },
      onChange(info) {
        if (info.file.status !== 'uploading') {
          console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
          message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
          message.error(`${info.file.name} file upload failed.`);
        }
      },
    };

    const encryptBuffer = async (data) => {
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const encryptionKey = await crypto.subtle.generateKey({ 'name': 'AES-CBC', 'length': 256 }, true, ['encrypt', 'decrypt']);
      const encryptedData = await crypto.subtle.encrypt({ 'name': 'AES-CBC', iv }, encryptionKey, data)
      return {
        encryptionKey,
        encryptedData,
        iv
      }
    }

    const uploadToTextile = async (bufferData, name) => {
      const raw = await buckets.pushPath('bafzbeibbklbg5ab4j7kwzk3jvc7h5k644hkdc6f6f26o73qh4g7plqudsm', name, {
        path: name,
        content: bufferData
      });
      return raw;
    }

    const fetchPathFromTextile = async (fileName, asString=true) => {
      const files = [];
      const repeater = await buckets.pullPath('bafzbeibbklbg5ab4j7kwzk3jvc7h5k644hkdc6f6f26o73qh4g7plqudsm',fileName);
      for await(let i of repeater) {
        if(i instanceof Uint8Array) {
            files.push(i);
          }
        }
      let result =  mergeUint8Arr(files);
      if(asString) {
        result = new TextDecoder().decode(result);
      }
      return result
    }

    const mergeUint8Arr = (myArrays) => {
      let length = 0;
      myArrays.forEach(item => {
        length += item.length;
      });
      let mergedArray = new Uint8Array(length);
      let offset = 0;
      myArrays.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
      });
      return mergedArray;
    }
//df367f0d5009376c7e9fb35786f017fd331cb059677c70332d351e6a745411e3
//df367f0d5009376c7e9fb35786f017fd331cb059677c70332d351e6a745411e3
    const getPubKeyFromMetamask = async () => {
      await ethereum.request({'method': 'eth_requestAccounts'});
      const pubKey = await ethereum.request({'method': 'eth_getEncryptionPublicKey','params': [ethereum.selectedAddress]});
      return pubKey;
    }

    const encryptWithPubKey = (pubkey, str) => {
      const encryptedData = ethSigEncrypt(pubkey, { data: str },'x25519-xsalsa20-poly1305');
      return encryptedData;
    }

    const decryptUsingMetamask = async (encryptedStr) => {
      console.log('decryptUsingMetamask', encryptedStr);
      const plainText = await ethereum.request({
          'method':'eth_decrypt',
          'params': [encryptedStr, ethereum.selectedAddress]
      });
      return plainText;
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    

    const testEncryption = async () => {
      const pubkey = await getPubKeyFromMetamask();
      console.log('getPubKeyFromMetamask', pubkey);
      const ed = encryptWithPubKey(pubkey, "ss");
      console.log('encryptWithPubKey', ed);
      const hexStr = hexlifyStr(ed);
      console.log('hexlifyStr', hexStr);
      await sleep(3000);
      const finalTest = await decryptUsingMetamask(hexStr);
      console.log('decryptUsingMetamask', finalTest);
      // spt(finalTest);
    }
    
    const createDocFromMembersList = (members, secretKey) => {
          const finalDoc = {};
          finalDoc['memberAccess'] = {};
          for(let m of members) {
            const memberHash = hexlifyStr(encryptWithPubKey(m.pubkey, secretKey));
            finalDoc['memberAccess'][m.address] = memberHash;
          }
          return finalDoc;
    }

    const hexlifyStr = (str) => {
      return utils.hexlify(Buffer.from(JSON.stringify(str)));
    }

    const uploadJson = async (jsonDoc, docPath) => {
        const jsonBuffer = Buffer.from(JSON.stringify(jsonDoc));
        const uploadedFile = await uploadToTextile(jsonBuffer, docPath);
        return uploadedFile;
    }

    const testUpload = async () => {
      await uploadJson({'key': ['val1','val2', Math.random().toString() ]},'jsondoc');
      await sleep(1000);
      const docs = await fetchPathFromTextile('jsondoc');
      alert(docs);
    }

    const createClub = async (memberPriceInEth, clubName, totalMembers) => {
      const lockAddress = await walletService.createLock({maxNumberOfKeys: totalMembers, name: clubName, expirationDuration: 12121311, keyPrice: memberPriceInEth});
      const lockContract = await walletService.getLockContract(lockAddress);
      const PostContract = require("../contracts/hardhat_contracts.json")['1337']['localhost']['contracts']['PublicLockPosts']
      lockContract.setEventHooks(PostContract.address,"0x0000000000000000000000000000000000000000")
      return lockAddress;
    }

    const subscribeToClub = async (lockAddress, pubkey) => {
      const transactionHash = await walletService.purchaseKey({
        lockAddress:lockAddress,
        data: Buffer.from(pubkey)
      }, (error, hash) =>{
        alert('tx', hash);
      });
      alert(`key purchased ${transactionHash}`)
      return transactionHash;
    }
    

    const testClubCreation = async () => {
      const la = await createClub("0.01","MyClub " + Math.random(), 100);
      const pubkey = await getPubKeyFromMetamask();
      const th = await subscribeToClub(la, pubkey);
      console.log('ALL DONE', la, th)
    }
    const fetchMembers = async () => {
      const pubkey = await getPubKeyFromMetamask();
      return [{
        'address': ethereum.selectedAddress,
        'pubkey': pubkey
      }];

      
    }
    // Convert a hex string to a byte array
function hexToBytes(hex) {
  for (var bytes = [], c = 0; c < hex.length; c += 2)
  bytes.push(parseInt(hex.substr(c, 2), 16));
  return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
      var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
      hex.push((current >>> 4).toString(16));
      hex.push((current & 0xF).toString(16));
  }
  return hex.join("");
}

    const publishPostFlow = async (fileObject, fileName, clubAddress, clubName) => {
        const fileBuffer = await fileObject.arrayBuffer();
        const encryptedBuffer = await encryptBuffer(fileBuffer);
        console.log('MATCH FILE LENGTH', encryptedBuffer.encryptedData.byteLength)
        const uploadedStatus  = await uploadToTextile(encryptedBuffer.encryptedData,`${clubName}/${fileName}`);
        const members = await fetchMembers();
        
        const arrayBuffer = await crypto.subtle.exportKey("raw",encryptedBuffer.encryptionKey);
        const ekeyhex = bytesToHex(new Uint8Array(arrayBuffer));
        
        const jsonDoc = createDocFromMembersList(members, ekeyhex);
        jsonDoc['iv'] = encryptedBuffer.iv;
        console.log("MATCH HEX", encryptedBuffer.iv);
        jsonDoc['filePath'] = `${clubName}/${fileName}`
        const jsonDocPath = `${clubName}/${fileName}_md`;
        await uploadJson(jsonDoc, jsonDocPath);
    
        const PostContract = require("../contracts/hardhat_contracts.json")['1337']['localhost']['contracts']['PublicLockPosts']
        const contract = new ethers.Contract(PostContract.address, PostContract.abi, signer);
        const postId  = await contract.publishPost(clubAddress, `${fileName},${jsonDocPath}`);
        return postId;
    }


    const fetchPostFlow = async (clubAddress,clubName) => {
      const myAddress = await ethereum.request({'method': 'eth_requestAccounts'});
      const PostContract = require("../contracts/hardhat_contracts.json")['1337']['localhost']['contracts']['PublicLockPosts']
      const contract = new ethers.Contract(PostContract.address, PostContract.abi, signer);
      const postURI = await contract.lastTokenURI();
      const jsonDocPath = postURI.split(',')[1]
      const jsonDocStr = await fetchPathFromTextile(jsonDocPath)
      const jsonDoc = JSON.parse(jsonDocStr);
      const strToDecrypt = jsonDoc['memberAccess'][myAddress[0]];
      const encryptionKeyHex = await decryptUsingMetamask(strToDecrypt);
      let decryptionKey = new Uint8Array(hexToBytes(encryptionKeyHex)).buffer;
      decryptionKey = await crypto.subtle.importKey('raw', decryptionKey, { 'name': 'AES-CBC', 'length': 256 }, true, ['encrypt', 'decrypt']);
      let filesInIPFS = await fetchPathFromTextile(jsonDoc.filePath, false);
      let fileInIPFS = filesInIPFS;
      let ivarr = []
      for(let i of Object.keys(jsonDoc.iv)){ 
        ivarr[i] = jsonDoc.iv[i]
      }
      const iv = new Uint8Array(ivarr);
      console.log('MATCH FILE LENGTH', fileInIPFS.byteLength)
      const fileAsBuffer = await crypto.subtle.decrypt({
        name: "AES-CBC",
        length: 256,
        iv: iv
      }, decryptionKey, fileInIPFS);
      

      console.log('DECRYPT', fileAsBuffer);
      
    }

    const runPublishPost = async () => {
          await publishPostFlow(fileToUpload, fileToUpload.name, "0xB0799ce4398c9A3CC37247d2CDe4D09c8E338F82", "ONE");
    }    

    const runFetchFlow = async () => {
        await fetchPostFlow("0xB0799ce4398c9A3CC37247d2CDe4D09c8E338F82","CLUB");
    }
    return  (<div>
            <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />}>Select File</Button>
            </Upload>
            <Button onClick={handleEncryptedUpload}>Start Upload</Button>
            <div>{pt}</div>
            <Button onClick={testClubCreation}>Create Club</Button>
            <Button onClick={runFetchFlow}>Fetch Flow</Button>
            <Button onClick={runPublishPost}>publish Post</Button>
            </div>);

}