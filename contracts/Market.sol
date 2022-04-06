// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './Land.sol';
import './Item.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';

contract Market is ERC1155Holder {
	ERC20 public _mzt;
	uint256 public _listedItems = 0;
	address[] public _acceptedTokens;
	address[] public _admins;
	uint16 public _listingFeePermille;

	constructor(
		address mztAddress,
		uint16 fee,
		address item,
		address land
	) {
		_mzt = ERC20(mztAddress);
		_admins = [msg.sender];
		_listingFeePermille = fee;
		_acceptedTokens = [item, land];
	}

	struct ListingERC1155 {
		address _contract;
		uint256 id;
		uint256 price;
		uint256[] amounts;
		address[] sellers;
	}

	struct ListingERC721 {
		address _contract;
		uint256 id;
		uint256 price;
		address seller;
	}

	event Listed(address contractAddress, uint256 id, address seller, uint256 amount, uint256 price);
	event Unlisted(address contractAddress, uint256 id, address seller);
	event Sold(address contractAddress, uint256 id, address buyer, uint256 amount, uint256 price);

	mapping(uint256 => ListingERC1155) public _listingsERC1155;
	mapping(uint256 => ListingERC721) public _listingsERC721;

	function listERC1155(
		address contractAddress,
		uint256 id,
		uint256 price,
		uint256 amount
	) public {
		require(tokenAccepted(contractAddress), 'token not accepted');
		Item _item = Item(contractAddress);

		require(_item.balanceOf(msg.sender, id) >= amount, 'listing can be done only by owner');

		if (_listingsERC1155[id].sellers.length == 0) {
			uint256[] memory amounts;
			address[] memory sellers;
			_listingsERC1155[id] = ListingERC1155(contractAddress, id, price, amounts, sellers);
			_listingsERC1155[id].amounts.push(amount);
			_listingsERC1155[id].sellers.push(msg.sender);
		} else {
			if (isSeller(id, msg.sender)) {
				uint256 index = getSellerIndex(id, msg.sender);
				_listingsERC1155[id].amounts[index] += amount;
			} else {
				_listingsERC1155[id].amounts.push(amount);
				_listingsERC1155[id].sellers.push(msg.sender);
			}
		}

		_item.safeTransferFrom(msg.sender, address(this), id, amount, '');

		_listedItems++;

		emit Listed(contractAddress, id, msg.sender, amount, price);
	}

	function buyERC1155(
		address contractAddress,
		uint256 id,
		uint256 amount
	) public {
		require(tokenAccepted(contractAddress), 'token not accepted');
		Item _item = Item(contractAddress);

		require(!isSeller(id, msg.sender), 'seller cannot be buyer');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');
		require(_item.balanceOf(address(this), id) > amount, 'above available amount');

		_mzt.transferFrom(msg.sender, address(this), _listingsERC1155[id].price * amount);

		address[] memory buyingFrom = new address[](_listingsERC1155[id].sellers.length);
		uint256[] memory buyingAmounts = new uint256[](_listingsERC1155[id].sellers.length);
		uint256 leftToBuy = amount;
		uint256 bought = 0;

		for (uint256 i = 0; i < _listingsERC1155[id].sellers.length; i++) {
			if (leftToBuy > 0) {
				if (_listingsERC1155[id].amounts[i] >= leftToBuy) {
					buyingFrom[i] = _listingsERC1155[id].sellers[i];
					buyingAmounts[i] = leftToBuy;

					_listingsERC1155[id].amounts[i] -= leftToBuy;
					leftToBuy = 0;

					bought++;

					break;
				} else if (_listingsERC1155[id].amounts[i] < leftToBuy) {
					buyingFrom[i] = _listingsERC1155[id].sellers[i];
					buyingAmounts[i] = _listingsERC1155[id].amounts[i];

					for (uint256 index = i; index < _listingsERC1155[id].sellers.length; index++) {
						_listingsERC1155[id].amounts[index] = _listingsERC1155[id].amounts[index + 1];
						_listingsERC1155[id].sellers[index] = _listingsERC1155[id].sellers[index + 1];
					}

					_listingsERC1155[id].amounts.pop();
					_listingsERC1155[id].sellers.pop();

					leftToBuy -= _listingsERC1155[id].amounts[i];

					bought++;

					continue;
				}
			}
			break;
		}

		uint256 amountForUser = _listingsERC1155[id].price - ((_listingsERC1155[id].price * ((_listingFeePermille * 1 ether) / 1000)) / 1 ether);

		for (uint256 i = 0; i < bought; i++) {
			_mzt.transfer(_listingsERC1155[id].sellers[i], amountForUser * buyingAmounts[i]);
		}

		_item.safeTransferFrom(address(this), msg.sender, id, amount, '');

		emit Sold(contractAddress, id, msg.sender, amount, _listingsERC1155[id].price);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _listingsERC1155[id];
			_listedItems--;
		}
	}

	function cancelERC1155(address contractAddress, uint256 id) public {
		require(tokenAccepted(contractAddress), 'token not accepted');
		Item _item = Item(contractAddress);

		require(isSeller(id, msg.sender), 'only owner can cancel listing');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');

		uint256 index = getSellerIndex(id, msg.sender);

		_item.safeTransferFrom(address(this), _listingsERC1155[id].sellers[index], id, _listingsERC1155[id].amounts[index], '');

		for (uint256 i = index; i < _listingsERC1155[id].sellers.length - 1; i++) {
			_listingsERC1155[id].amounts[i] = _listingsERC1155[id].amounts[i + 1];
			_listingsERC1155[id].sellers[i] = _listingsERC1155[id].sellers[i + 1];
		}

		_listingsERC1155[id].amounts.pop();
		_listingsERC1155[id].sellers.pop();

		emit Unlisted(contractAddress, id, msg.sender);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _listingsERC1155[id];
			_listedItems--;
		}
	}

	function getERC1155Listing(uint256 listingId) public view returns (ListingERC1155 memory) {
		return _listingsERC1155[listingId];
	}

	function listingsERC1155(address contractAddress) public view returns (ListingERC1155[] memory) {
		require(tokenAccepted(contractAddress), 'token not accepted');

		uint256 n = 0;
		for (uint256 i = 0; i < _listedItems; i++) {
			if (_listingsERC1155[i]._contract == contractAddress && _listingsERC1155[i].sellers.length > 0) {
				n++;
			}
		}

		ListingERC1155[] memory ret = new ListingERC1155[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _listedItems; i++) {
			if (_listingsERC1155[i]._contract == contractAddress && _listingsERC1155[i].sellers.length > 0) {
				ret[current] = _listingsERC1155[i];
				current++;
			}
		}
		return ret;
	}

	function withdrawAll() public {
		require(isAdmin(msg.sender), 'not admin');
		_mzt.transfer(msg.sender, _mzt.balanceOf(address(this)));
	}

	function withdraw(address token, uint256 amount) public {
		require(isAdmin(msg.sender), 'not admin');
		ERC20 _token = ERC20(token);
		require(amount <= _token.balanceOf(address(this)), 'amount is larger than token balance');
		_token.transfer(msg.sender, amount);
	}

	function setListingFee(uint8 amount) public {
		require(isAdmin(msg.sender), 'not admin');
		_listingFeePermille = amount;
	}

	function isSeller(uint256 id, address seller) public view returns (bool) {
		if (_listingsERC1155[id].sellers.length > 0) {
			for (uint256 i = 0; i < _listingsERC1155[id].sellers.length; i++) {
				if (_listingsERC1155[id].sellers[i] == seller) return true;
			}
		}
		return false;
	}

	function getSellerIndex(uint256 id, address seller) public view returns (uint256) {
		require(isSeller(id, seller), 'seller did not list this item');

		for (uint256 i = 0; i < _listingsERC1155[id].sellers.length; i++) {
			if (_listingsERC1155[id].sellers[i] == seller) return i;
		}

		return 0;
	}

	function isAdmin(address account) public view returns (bool) {
		for (uint256 i = 0; i < _admins.length; i++) {
			if (_admins[i] == account) return true;
		}
		return false;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_admins = admins;
	}

	function tokenAccepted(address token) public view returns (bool) {
		for (uint256 i = 0; i < _acceptedTokens.length; i++) {
			if (_acceptedTokens[i] == token) return true;
		}
		return false;
	}

	function setAcceptedTokens(address[] memory tokens) public {
		require(isAdmin(msg.sender), 'admin only');
		_acceptedTokens = tokens;
	}
}
