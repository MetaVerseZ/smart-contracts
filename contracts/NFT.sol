// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

contract NFT is ERC721URIStorage {
	address marketAddress;

	constructor(address _marketAddress) ERC721('NFT', 'NFT') {
		marketAddress = _marketAddress;
	}

	uint256 public _tokenId = 0;

	function mint(string memory _tokenURI) external returns (uint256) {
		_mint(msg.sender, _tokenId);
		_setTokenURI(_tokenId, _tokenURI);
		setApprovalForAll(marketAddress, true);
		_tokenId++;
		return (_tokenId - 1);
	}
}
