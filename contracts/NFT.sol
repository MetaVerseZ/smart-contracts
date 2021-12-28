// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import 'hardhat/console.sol';

contract NFT is ERC721URIStorage {
	using Counters for Counters.Counter;
	Counters.Counter private numberOfItems;
	address contractAddress;

	constructor(address _marketAddress) ERC721('Metaverse', 'METT') {
		contractAddress = _marketAddress;
	}

	function createToken(string memory _tokenURI) public returns (uint256) {
		numberOfItems.increment();
		uint256 itemId = numberOfItems.current();

		_mint(msg.sender, itemId);
		_setTokenURI(itemId, _tokenURI);
		setApprovalForAll(contractAddress, true);
		return itemId;
	}
}
