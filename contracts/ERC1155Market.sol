// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import './Market.sol';
import './ERC1155Item.sol';

contract ERC1155Market is ERC1155Holder, Market {
	struct Listing {
		uint256 id;
		uint256 price;
		uint256[] amounts;
		address[] sellers;
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
		_acceptdTokens = [item];
	}

	function list(
		address addr,
		uint256 id,
		uint256 price,
		uint256 amount
	) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(_item.balanceOf(msg.sender, id) >= amount, 'listing can be done only by owner');

		if (_lis[addr][id].sellers.length == 0) {
			uint256[] memory amounts;
			address[] memory sellers;
			_lis[addr][id] = Listing(id, price, amounts, sellers);
			_lis[addr][id].amounts.push(amount);
			_lis[addr][id].sellers.push(msg.sender);
		} else {
			if (isSeller(addr, id, msg.sender)) {
				uint256 index = sellerIdx(addr, id, msg.sender);
				_lis[addr][id].amounts[index] += amount;
			} else {
				_lis[addr][id].amounts.push(amount);
				_lis[addr][id].sellers.push(msg.sender);
			}
		}

		_item.safeTransferFrom(msg.sender, address(this), id, amount, '');

		if (id >= _max[addr]) _max[addr] = id + 1;

		emit Listed(addr, id, msg.sender, amount, price);
	}

	function buy(
		address addr,
		uint256 id,
		uint256 amount
	) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(!isSeller(addr, id, msg.sender), 'seller cannot be buyer');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');
		require(_item.balanceOf(address(this), id) > amount, 'above available amount');

		_mzt.transferFrom(msg.sender, address(this), _lis[addr][id].price * amount);

		address[] memory buyingFrom = new address[](_lis[addr][id].sellers.length);
		uint256[] memory buyingAmounts = new uint256[](_lis[addr][id].sellers.length);
		uint256 leftToBuy = amount;
		uint256 bought = 0;

		for (uint256 i = 0; i < _lis[addr][id].sellers.length; i++) {
			if (leftToBuy > 0) {
				if (_lis[addr][id].amounts[i] >= leftToBuy) {
					buyingFrom[i] = _lis[addr][id].sellers[i];
					buyingAmounts[i] = leftToBuy;

					_lis[addr][id].amounts[i] -= leftToBuy;
					leftToBuy = 0;

					bought++;

					break;
				} else if (_lis[addr][id].amounts[i] < leftToBuy) {
					buyingFrom[i] = _lis[addr][id].sellers[i];
					buyingAmounts[i] = _lis[addr][id].amounts[i];

					for (uint256 index = i; index < _lis[addr][id].sellers.length; index++) {
						_lis[addr][id].amounts[index] = _lis[addr][id].amounts[index + 1];
						_lis[addr][id].sellers[index] = _lis[addr][id].sellers[index + 1];
					}

					_lis[addr][id].amounts.pop();
					_lis[addr][id].sellers.pop();

					leftToBuy -= _lis[addr][id].amounts[i];

					bought++;

					continue;
				}
			}
			break;
		}

		uint256 userAm = _lis[addr][id].price - ((_lis[addr][id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		for (uint256 i = 0; i < bought; i++) {
			_mzt.transfer(_lis[addr][id].sellers[i], userAm * buyingAmounts[i]);
		}

		_item.safeTransferFrom(address(this), msg.sender, id, amount, '');

		emit Sold(addr, id, msg.sender, amount, _lis[addr][id].price);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _lis[addr][id];
		}
	}

	function unlist(address addr, uint256 id) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(isSeller(addr, id, msg.sender), 'only seller can cancel listing');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');

		uint256 index = sellerIdx(addr, id, msg.sender);

		_item.safeTransferFrom(address(this), _lis[addr][id].sellers[index], id, _lis[addr][id].amounts[index], '');

		for (uint256 i = index; i < _lis[addr][id].sellers.length - 1; i++) {
			_lis[addr][id].amounts[i] = _lis[addr][id].amounts[i + 1];
			_lis[addr][id].sellers[i] = _lis[addr][id].sellers[i + 1];
		}

		_lis[addr][id].amounts.pop();
		_lis[addr][id].sellers.pop();

		emit Unlisted(addr, id, msg.sender);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _lis[addr][id];
		}
	}

	function listing(address addr, uint256 id) public view returns (Listing memory) {
		return _lis[addr][id];
	}

	function listings(address addr) public view returns (Listing[] memory) {
		require(tokenAccepted(addr), 'token not accepted');

		uint256 n = 0;
		for (uint256 i = 0; i < _max[addr]; i++) {
			if (_lis[addr][i].sellers.length > 0) {
				n++;
			}
		}

		Listing[] memory ret = new Listing[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _max[addr]; i++) {
			if (_lis[addr][i].sellers.length > 0) {
				ret[current] = _lis[addr][i];
				current++;
			}
		}
		return ret;
	}

	function isSeller(
		address addr,
		uint256 id,
		address seller
	) public view returns (bool) {
		if (_lis[addr][id].sellers.length > 0) {
			for (uint256 i = 0; i < _lis[addr][id].sellers.length; i++) {
				if (_lis[addr][id].sellers[i] == seller) return true;
			}
		}
		return false;
	}

	function sellerIdx(
		address addr,
		uint256 id,
		address seller
	) public view returns (uint256) {
		require(isSeller(addr, id, seller), 'seller did not list this item');

		for (uint256 i = 0; i < _lis[addr][id].sellers.length; i++) {
			if (_lis[addr][id].sellers[i] == seller) return i;
		}

		return 0;
	}
}
