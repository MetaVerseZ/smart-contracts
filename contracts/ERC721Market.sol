// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';
import './Market.sol';
import './ERC721Item.sol';

contract ERC721Market is ERC721Holder, Market {
	struct Listing {
		uint256 id;
		uint256 price;
		address seller;
	}

	mapping(address => mapping(uint256 => Listing)) public _lis;
	mapping(address => uint256) public _max;

	constructor(
		address mzt,
		uint16 fee,
		address item
	) {
		_mzt = ERC20(mzt);
		_adm = [msg.sender];
		_lisFee = fee;
		_acceptedItems = [item];
	}

	function list(
		address addr,
		uint256 id,
		uint256 price
	) public {
		require(itemAccepted(addr), 'item not accepted');
		CustomItem _item = CustomItem(addr);

		require(id < _item._tokenId(), 'land not minted');
		require(msg.sender == _item.ownerOf(id), 'listing can be done only by owner');
		require(_lis[addr][id].seller == address(0), 'item already listed');

		_lis[addr][id] = Listing(id, price, msg.sender);

		if (id >= _max[addr]) _max[addr] = id + 1;

		_item.safeTransferFrom(msg.sender, address(this), id);

		emit Listed(addr, id, msg.sender, 1, price);
	}

	function buy(address addr, uint256 id) public {
		require(itemAccepted(addr), 'item not accepted');
		CustomItem _item = CustomItem(addr);

		require(_lis[addr][id].seller != address(0), 'listing is not active');
		require(msg.sender != _lis[addr][id].seller, 'seller cannot be buyer');

		uint256 userAm = _lis[addr][id].price - ((_lis[addr][id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		uint256 price = _lis[addr][id].price;
		address seller = _lis[addr][id].seller;

		delete _lis[addr][id];

		_mzt.transferFrom(msg.sender, address(this), price);
		_mzt.transfer(seller, userAm);

		_item.safeTransferFrom(address(this), msg.sender, id);

		emit Sold(addr, id, msg.sender, 1, price);
	}

	function unlist(address addr, uint256 id) public {
		require(itemAccepted(addr), 'item not accepted');
		CustomItem _item = CustomItem(addr);

		require(_lis[addr][id].seller != address(0), 'listing is not active');
		require(msg.sender == _lis[addr][id].seller, 'only seller can cancel listing');

		delete _lis[addr][id];

		_item.safeTransferFrom(address(this), msg.sender, id);

		emit Unlisted(addr, id, msg.sender);
	}

	function listing(address addr, uint256 id) public view returns (Listing memory) {
		return _lis[addr][id];
	}

	function listings(address addr) public view returns (Listing[] memory) {
		require(itemAccepted(addr), 'item not accepted');

		uint256 n = 0;
		for (uint256 i = 0; i < _max[addr]; i++) {
			if (_lis[addr][i].seller != address(0)) {
				n++;
			}
		}

		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _max[addr]; i++) {
			if (_lis[addr][i].seller != address(0)) {
				ret[current] = _lis[addr][i];
				current++;
			}
		}
		return ret;
	}
}
