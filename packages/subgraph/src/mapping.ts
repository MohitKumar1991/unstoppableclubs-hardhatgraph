import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  NewLock
} from "../generated/Unlock/Unlock"
import {
  PublicLock as PublicLockTemplate
} from "../generated/templates"
import {
  Transfer, PublicLock
} from "../generated/templates/PublicLock/PublicLock"
import {
  PostPublished, NewMember
} from "../generated/PublicLockPosts/PublicLockPosts"
import { Post, Lock, Key, Member } from "../generated/schema"
/**
 * 
 * type Post @entity {
  id: ID!
  sender: Bytes!
  description: String!
  filepath: String!
  createdAt: BigInt!
  transactionHash: String!
}
 * 
 */
export function handlePostPublished(event: PostPublished): void {

  let itemId = event.params.itemId
  let post = new Post(itemId.toHex())
  post.sender = "firstclub"
  post.createdAt = event.block.timestamp
  post.transactionHash = event.transaction.hash.toHex()
  let itemdetails = event.params.itemURI.split(',')
  post.description = itemdetails[0]
  post.filepath = itemdetails[1]
  post.lock = event.params.lockAddress.toHexString()

  post.save()

}

export function handleNewLock(event: NewLock): void {
    let lockAddress = event.params.newLockAddress
    let chainPublicLock = PublicLock.bind(lockAddress)
    let lock = new Lock(lockAddress.toHexString())
    lock.price = chainPublicLock.keyPrice()
    lock.name = chainPublicLock.name()
    lock.createdAt = event.block.timestamp
    lock.owner = event.params.lockOwner.toHexString()
    lock.save()
    PublicLockTemplate.create(lockAddress)
    

}

export function handleTransfer(event: Transfer): void {
  let zeroAddress = '0x0000000000000000000000000000000000000000'
  let keyId = event.address.toHex().concat('-').concat(event.params.tokenId.toHex())
  
  if (event.params.from.toHex() == zeroAddress) {
    //new key
    let key = new Key(keyId)
    key.lock = event.address.toHexString()
    key.owner = event.params.to.toHex()
    key.createdAt = event.block.timestamp
    key.save()
  } else {
    let key = Key.load(keyId)
    key.lock = event.address.toHexString()
    key.owner = event.params.to.toHex()
    key.createdAt = event.block.timestamp
    key.save()
  }
 
}

export function handleNewMember(event: NewMember): void {
  let member = new Member(event.params.lockAddress.toHex()+"-"+event.params.memberAddress.toHex());
  member.lock = event.params.lockAddress.toHexString()
  member.address = event.params.memberAddress.toHexString()
  member.pubkey = event.params.pubkey
  member.createdAt = event.block.timestamp
  member.save()

}

