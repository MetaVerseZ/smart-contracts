// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

contract Item is ERC721URIStorage {
	uint256 public _tokenId;

	address public market = address(0);
	address public admin;

	event Minted(address owner, uint256 tokenId);

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
		emit Minted(msg.sender, tokenId);
		_tokenId++;
	}

	function burn(uint256 tokenId) public {
		require(ERC721.ownerOf(tokenId) == msg.sender, 'only owner can burn');
		super._burn(tokenId);
	}
}
