pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
//import "@openzeppelin/contracts/access/Ownable.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

interface ILockKeyPurchaseHook
{

  function keyPurchasePrice(
    address from,
    address recipient,
    address referrer,
    bytes calldata data
  ) external view
    returns (uint minKeyPrice);

 
  function onKeyPurchase(
    address from,
    address recipient,
    address referrer,
    bytes calldata data,
    uint minKeyPrice,
    uint pricePaid
  ) external;
}

contract PublicLockPosts is ERC721URIStorage, ILockKeyPurchaseHook {
  using Counters for Counters.Counter; 
  Counters.Counter private _tokenIds; 

  event PostPublished(address lockAddress, uint256 itemId, string itemURI);

  event NewMember(address lockAddress, address memberAddress, string pubkey);

  string public lastTokenURI = "None";

  mapping(uint256 => address) public itemLockMap;

  constructor() ERC721("POSTS", "PPP") {

  }

  function publishPost(address lockAddress, string memory itemURI)  public returns  (uint256)
  {
       
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, itemURI);

        lastTokenURI = itemURI;
        itemLockMap[newItemId] = lockAddress; 
        emit PostPublished(lockAddress, newItemId, itemURI);
        
        return newItemId;
  }

  function getLockAddress(uint256 itemId) external view returns (address) {
        return itemLockMap[itemId];
  }

  function keyPurchasePrice(
    address from,
    address recipient,
    address referrer,
    bytes calldata data
  ) external view override
    returns (uint) {
      uint minKeyPrice = 0;
      return minKeyPrice;
    }

   function onKeyPurchase(
      address from,
      address recipient,
      address referrer,
      bytes calldata data,
      uint minKeyPrice,
      uint pricePaid
    ) external override {
        emit NewMember(msg.sender, recipient, string(data));
    }

}
