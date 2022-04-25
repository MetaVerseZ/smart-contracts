// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import 'hardhat/console.sol';

contract Land is ERC721 {
	uint256 public _tokenId;

	struct Coordinates {
		address owner;
		uint8 x;
		uint8 y;
	}

	struct Item {
		bool minted;
		uint256 id;
	}

	Coordinates[] public _coordinates;
	mapping(uint8 => mapping(uint8 => Item)) public _items;

	address public _market = address(0);
	address[] public _admins;

	event Minted(address owner, uint256 tokenId, uint8 x, uint8 y);

	constructor() ERC721('Meta Z Land', 'MZL') {
		_admins = [msg.sender];
	}

	function mint(uint8 x, uint8 y) public {
		require(isAdmin(msg.sender), 'only admin');
		require(_market != address(0), 'market undefined');
		require(!_items[x][y].minted, 'land already minted');

		_safeMint(msg.sender, _tokenId);
		setApprovalForAll(_market, true);

		_items[x][y] = Item(true, _tokenId);
		_coordinates.push(Coordinates(msg.sender, x, y));

		_tokenId++;

		emit Minted(msg.sender, _tokenId - 1, x, y);
	}

	function burn(uint256 tokenId) public {
		require(ERC721.ownerOf(tokenId) == msg.sender, 'only owner can burn');
		super._burn(tokenId);
	}

	function isAdmin(address account) public view returns (bool) {
		for (uint256 i = 0; i < _admins.length; i++) {
			if (_admins[i] == account) {
				return true;
			}
		}
		return false;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_admins = admins;
	}

	function setMarket(address _marketAddress) public {
		require(isAdmin(msg.sender), 'not admin');
		_market = _marketAddress;
		setApprovalForAll(_market, true);
	}

	function batchMint(
		uint8 start,
		uint8 xEnd,
		uint8 yEnd
	) public {
		require(isAdmin(msg.sender), 'only admin');
		require(start <= xEnd && start <= yEnd, 'start must be lower than end');

		for (uint8 i = start; i <= xEnd; i++) {
			for (uint8 j = start; j <= yEnd; j++) {
				mint(i, j);
				console.log(_tokenId);
			}
		}
	}

	function map() public view returns (Coordinates[] memory) {
		return _coordinates;
	}
}
