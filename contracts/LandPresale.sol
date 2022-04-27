// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Land.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';

contract LandPresale is ERC721Holder {
	Land _land;
	address payable public _admin;

	uint256 public _price = 5 * 1e17;
	bool _active = true;

	uint8 _minX = 0;
	uint8 _minY = 0;
	uint8 _maxX = 31;
	uint8 _maxY = 31;

	constructor(address land) {
		_admin = payable(msg.sender);
		_land = Land(land);
	}

	function getLand(uint8 x, uint8 y) public payable {
		require(_active, 'presale inactive');
		require(msg.value >= _price, 'message value lower than land price');
		require(x >= _minX && x <= _maxX);
		require(y >= _minY && x <= _maxY);

		uint32 id = _land._tokenId();
		_land.mint(x, y);

		(bool success1, ) = _admin.call{value: _price}('');
		require(success1, 'transfer failed');

		if (msg.value > _price) {
			(bool success2, ) = msg.sender.call{value: (msg.value - _price)}('');
			require(success2, 'transfer failed');
		}

		_land.safeTransferFrom(address(this), msg.sender, id);
	}

	function withdraw(uint256 id) public {
		require(msg.sender == _admin, 'not admin');
		_land.safeTransferFrom(address(this), _admin, id);
	}

	function setPrice(uint256 price) public {
		_price = price;
	}

	function batchMint(
		uint8 start,
		uint8 xEnd,
		uint8 yEnd
	) public {
		require(msg.sender == _admin, 'only admin');
		_land.batchMint(start, xEnd, yEnd);
	}

	function setMinMax(
		uint8 minX,
		uint8 minY,
		uint8 maxX,
		uint8 maxY
	) public {
		_minX = minX;
		_minY = minY;
		_maxX = maxX;
		_maxY = maxY;
	}
}
