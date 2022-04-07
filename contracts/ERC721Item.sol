// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

abstract contract CustomItem is ERC721 {
	uint256 public _tokenId = 0;

	address public _market = address(0);
	address[] public _admins;

	mapping(uint256 => string) private _tokenURIs;

	event Minted(address owner, uint256 tokenId, uint256 amount);

	function mint(string memory uri, uint256 amount) public virtual;

	function isAdmin(address account) public view virtual returns (bool);

	function setAdmins(address[] memory admins) public virtual;

	function setMarket(address market) public virtual;
}
