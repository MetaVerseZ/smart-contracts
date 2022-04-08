// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import './Market.sol';
import './Land.sol';

contract LandMarket is ERC721Holder, Market {
	Land public _land;
	uint256 public _max = 0;

	struct Listing {
		uint256 id;
		uint256 price;
		address seller;
	}

	mapping(uint256 => Listing) public _lis;

	constructor(
		address mzt,
		uint16 fee,
		address land
	) {
		_mzt = ERC20(mzt);
		_adm = [msg.sender];
		_lisFee = fee;
		_acceptdTokens = [land];
		_land = Land(land);
	}

	function list(uint256 id, uint256 price) public {
		require(id < _land._tokenId(), 'land not minted');
		require(msg.sender == _land.ownerOf(id), 'listing can be done only by owner');
		require(_lis[id].seller == address(0), 'item already listed');

		_lis[id] = Listing(id, price, msg.sender);

		_land.safeTransferFrom(msg.sender, address(this), id);

		if (id >= _max) _max = id + 1;

		emit Listed(address(_land), id, msg.sender, 1, price);
	}

	function buy(uint256 id) public {
		require(_lis[id].seller != address(0), 'listing is not active');
		require(msg.sender != _lis[id].seller, 'seller cannot be buyer');

		uint256 userAm = _lis[id].price - ((_lis[id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		_mzt.transferFrom(msg.sender, address(this), _lis[id].price);
		_mzt.transfer(_lis[id].seller, userAm);

		_land.safeTransferFrom(address(this), msg.sender, id);

		delete _lis[id];

		emit Sold(address(_land), id, msg.sender, 1, _lis[id].price);
	}

	function unlist(uint256 id) public {
		require(_lis[id].seller != address(0), 'listing is not active');
		require(msg.sender == _lis[id].seller, 'only seller can cancel listing');

		_land.safeTransferFrom(address(this), msg.sender, id);

		delete _lis[id];

		emit Unlisted(address(_land), id, msg.sender);
	}

	function listing(uint256 id) public view returns (Listing memory) {
		return _lis[id];
	}

	function listings() public view returns (Listing[] memory) {
		uint256 n = 0;
		for (uint256 i = 0; i < _max; i++) {
			if (_lis[i].seller != address(0)) {
				n++;
			}
		}

		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _max; i++) {
			if (_lis[i].seller != address(0)) {
				ret[current] = _lis[i];
				current++;
			}
		}
		return ret;
	}
}
