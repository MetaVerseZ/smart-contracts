// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';

abstract contract ERC721Item is ERC721URIStorage {
	uint256 public _tokenId = 0;

	address public _market = address(0);
	address[] public _admins;

	event Minted(address owner, uint256 tokenId);

	function mint(string memory uri) public virtual;

	function isAdmin(address account) public view virtual returns (bool);

	function setAdmins(address[] memory admins) public virtual;

	function setMarket(address market) public virtual;
}
