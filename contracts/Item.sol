// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

contract Item is ERC721URIStorage {
	uint256 public _tokenId;

	address public market = address(0);
	address public admin;

	constructor(address _adminAddress) ERC721('Meta Z Item', 'MZI') {
		admin = _adminAddress;
	}

	function _baseURI() internal pure override returns (string memory) {
		return 'ipfs://';
	}

	function setMarket(address _marketAddress) public {
		require(msg.sender == admin, 'not admin');
		market = _marketAddress;
	}

	function mint(string memory uri) public {
		require(market != address(0), 'zero address');
		uint256 tokenId = _tokenId;
		_safeMint(msg.sender, tokenId);
		_setTokenURI(tokenId, uri);
		setApprovalForAll(market, true);
		_tokenId++;
	}

	function burn(uint256 tokenId) public {
		require(ERC721.ownerOf(tokenId) == msg.sender, 'only owner can burn');
		super._burn(tokenId);
	}

	function getAccountItems(address account) public view returns (uint256[] memory) {
		require(market != address(0));
		uint256 ownedItems = 0;
		for (uint256 i = 0; i < _tokenId; i++) {
			if (ERC721.ownerOf(i) == account) {
				ownedItems++;
			}
		}

		uint256[] memory ret = new uint256[](ownedItems);
		uint256 retIndex = 0;
		for (uint256 i = 0; i < _tokenId; i++) {
			if (ERC721.ownerOf(i) == account) {
				ret[retIndex] = i;
				retIndex++;
			}
		}
		return ret;
	}
}
