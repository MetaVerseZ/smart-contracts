// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import './Land.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';

contract LandPresale is ERC721Holder {
	Land _land;
	address payable public _admin;
	uint256 public _price = 5 * 1e17;

	constructor(address land) {
		_admin = payable(msg.sender);
		_land = Land(land);
	}

	function getLand(uint256 id) public payable {
		require(msg.value >= _price, 'message value lower than land price');
		_land.safeTransferFrom(address(this), msg.sender, id);

		(bool success1, ) = _admin.call{value:_price}('');
		require(success1, "transfer failed");

		if (msg.value > _price) {
			(bool success2, ) = msg.sender.call{value:(msg.value - _price)}('');
			require(success2, "transfer failed");
		}
	}

	function withdraw(uint256 id) public {
		require(msg.sender == _admin, 'not admin');
		_land.safeTransferFrom(address(this), _admin, id);
	}

	function setPrice(uint256 price) public {
		_price = price;
	}
}
