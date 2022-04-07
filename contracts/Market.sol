// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './Land.sol';
import './ERC1155Item.sol';
import './ERC721Item.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol';

contract Market is ERC1155Holder, ERC721Holder {
	ERC20 public _mzt;
	Land public _land;
	uint256 public _maxLand = 0;
	address[] public _acceptdTokens;
	address[] public _adm;
	uint16 public _lisFee;

	constructor(
		address mzt,
		uint16 fee,
		address it,
		address l
	) {
		_mzt = ERC20(mzt);
		_adm = [msg.sender];
		_lisFee = fee;
		_acceptdTokens = [it, l];
		_land = Land(l);
	}

	struct LisERC1155 {
		uint256 id;
		uint256 price;
		uint256[] amounts;
		address[] sellers;
	}

	struct LisERC721 {
		uint256 id;
		uint256 price;
		address seller;
	}

	struct LisLand {
		uint256 id;
		uint256 price;
		address seller;
	}

	event Listed(address addr, uint256 id, address seller, uint256 amount, uint256 price);
	event Unlisted(address addr, uint256 id, address seller);
	event Sold(address addr, uint256 id, address buyer, uint256 amount, uint256 price);

	mapping(address => mapping(uint256 => LisERC1155)) public _lisERC1155;
	mapping(address => mapping(uint256 => LisERC721)) public _lisERC721;
	mapping(uint256 => LisLand) public _lisLand;

	mapping(address => uint256) public _maxIt;
	mapping(address => uint256) public _maxCusIt;

	function listERC1155(
		address addr,
		uint256 id,
		uint256 price,
		uint256 amount
	) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(_item.balanceOf(msg.sender, id) >= amount, 'listing can be done only by owner');

		if (_lisERC1155[addr][id].sellers.length == 0) {
			uint256[] memory amounts;
			address[] memory sellers;
			_lisERC1155[addr][id] = LisERC1155(id, price, amounts, sellers);
			_lisERC1155[addr][id].amounts.push(amount);
			_lisERC1155[addr][id].sellers.push(msg.sender);
		} else {
			if (isSeller(addr, id, msg.sender)) {
				uint256 index = getSellerIndex(addr, id, msg.sender);
				_lisERC1155[addr][id].amounts[index] += amount;
			} else {
				_lisERC1155[addr][id].amounts.push(amount);
				_lisERC1155[addr][id].sellers.push(msg.sender);
			}
		}

		_item.safeTransferFrom(msg.sender, address(this), id, amount, '');

		if (id >= _maxIt[addr]) _maxIt[addr] = id + 1;

		emit Listed(addr, id, msg.sender, amount, price);
	}

	function buyERC1155(
		address addr,
		uint256 id,
		uint256 amount
	) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(!isSeller(addr, id, msg.sender), 'seller cannot be buyer');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');
		require(_item.balanceOf(address(this), id) > amount, 'above available amount');

		_mzt.transferFrom(msg.sender, address(this), _lisERC1155[addr][id].price * amount);

		address[] memory buyingFrom = new address[](_lisERC1155[addr][id].sellers.length);
		uint256[] memory buyingAmounts = new uint256[](_lisERC1155[addr][id].sellers.length);
		uint256 leftToBuy = amount;
		uint256 bought = 0;

		for (uint256 i = 0; i < _lisERC1155[addr][id].sellers.length; i++) {
			if (leftToBuy > 0) {
				if (_lisERC1155[addr][id].amounts[i] >= leftToBuy) {
					buyingFrom[i] = _lisERC1155[addr][id].sellers[i];
					buyingAmounts[i] = leftToBuy;

					_lisERC1155[addr][id].amounts[i] -= leftToBuy;
					leftToBuy = 0;

					bought++;

					break;
				} else if (_lisERC1155[addr][id].amounts[i] < leftToBuy) {
					buyingFrom[i] = _lisERC1155[addr][id].sellers[i];
					buyingAmounts[i] = _lisERC1155[addr][id].amounts[i];

					for (uint256 index = i; index < _lisERC1155[addr][id].sellers.length; index++) {
						_lisERC1155[addr][id].amounts[index] = _lisERC1155[addr][id].amounts[index + 1];
						_lisERC1155[addr][id].sellers[index] = _lisERC1155[addr][id].sellers[index + 1];
					}

					_lisERC1155[addr][id].amounts.pop();
					_lisERC1155[addr][id].sellers.pop();

					leftToBuy -= _lisERC1155[addr][id].amounts[i];

					bought++;

					continue;
				}
			}
			break;
		}

		uint256 userAm = _lisERC1155[addr][id].price - ((_lisERC1155[addr][id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		for (uint256 i = 0; i < bought; i++) {
			_mzt.transfer(_lisERC1155[addr][id].sellers[i], userAm * buyingAmounts[i]);
		}

		_item.safeTransferFrom(address(this), msg.sender, id, amount, '');

		emit Sold(addr, id, msg.sender, amount, _lisERC1155[addr][id].price);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _lisERC1155[addr][id];
		}
	}

	function cancelERC1155(address addr, uint256 id) public {
		require(tokenAccepted(addr), 'token not accepted');
		Item _item = Item(addr);

		require(isSeller(addr, id, msg.sender), 'only seller can cancel listing');
		require(_item.balanceOf(address(this), id) > 0, 'listing is not active');

		uint256 index = getSellerIndex(addr, id, msg.sender);

		_item.safeTransferFrom(address(this), _lisERC1155[addr][id].sellers[index], id, _lisERC1155[addr][id].amounts[index], '');

		for (uint256 i = index; i < _lisERC1155[addr][id].sellers.length - 1; i++) {
			_lisERC1155[addr][id].amounts[i] = _lisERC1155[addr][id].amounts[i + 1];
			_lisERC1155[addr][id].sellers[i] = _lisERC1155[addr][id].sellers[i + 1];
		}

		_lisERC1155[addr][id].amounts.pop();
		_lisERC1155[addr][id].sellers.pop();

		emit Unlisted(addr, id, msg.sender);

		if (_item.balanceOf(address(this), id) == 0) {
			delete _lisERC1155[addr][id];
		}
	}

	function getERC1155Listing(address addr, uint256 id) public view returns (LisERC1155 memory) {
		return _lisERC1155[addr][id];
	}

	function listingsERC1155(address addr) public view returns (LisERC1155[] memory) {
		require(tokenAccepted(addr), 'token not accepted');

		uint256 n = 0;
		for (uint256 i = 0; i < _maxIt[addr]; i++) {
			if (_lisERC1155[addr][i].sellers.length > 0) {
				n++;
			}
		}

		LisERC1155[] memory ret = new LisERC1155[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _maxIt[addr]; i++) {
			if (_lisERC1155[addr][i].sellers.length > 0) {
				ret[current] = _lisERC1155[addr][i];
				current++;
			}
		}
		return ret;
	}

	function listLand(uint256 id, uint256 price) public {
		require(id < _land._tokenId(), 'land not minted');
		require(msg.sender == _land.ownerOf(id), 'listing can be done only by owner');
		require(_lisLand[id].seller == address(0), 'item already listed');

		_lisLand[id] = LisLand(id, price, msg.sender);

		_land.safeTransferFrom(msg.sender, address(this), id);

		if (id >= _maxLand) _maxLand = id + 1;

		emit Listed(address(_land), id, msg.sender, 1, price);
	}

	function buyLand(uint256 id) public {
		LisLand storage listing = _lisLand[id];

		require(listing.seller != address(0), 'listing is not active');
		require(msg.sender != listing.seller, 'seller cannot be buyer');

		uint256 userAm = _lisLand[id].price - ((_lisLand[id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		_mzt.transferFrom(msg.sender, address(this), listing.price);
		_mzt.transfer(listing.seller, userAm);

		_land.safeTransferFrom(address(this), msg.sender, id);

		delete _lisLand[id];

		emit Sold(address(_land), id, msg.sender, 1, listing.price);
	}

	function cancelLand(uint256 id) public {
		LisLand storage listing = _lisLand[id];

		require(listing.seller != address(0), 'listing is not active');
		require(msg.sender == listing.seller, 'only seller can cancel listing');

		_land.safeTransferFrom(address(this), msg.sender, id);

		delete _lisLand[id];

		emit Unlisted(address(_land), id, msg.sender);
	}

	function getLandListing(uint256 id) public view returns (LisLand memory) {
		return _lisLand[id];
	}

	function landListings() public view returns (LisLand[] memory) {
		uint256 n = 0;
		for (uint256 i = 0; i < _maxLand; i++) {
			if (_lisLand[i].seller != address(0)) {
				n++;
			}
		}

		LisLand[] memory ret = new LisLand[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _maxLand; i++) {
			if (_lisLand[i].seller != address(0)) {
				ret[current] = _lisLand[i];
				current++;
			}
		}
		return ret;
	}

	function listERC721(
		address addr,
		uint256 id,
		uint256 price
	) public {
		require(tokenAccepted(addr), 'token not accepted');
		CustomItem _item = CustomItem(addr);

		require(id < _item._tokenId(), 'land not minted');
		require(msg.sender == _item.ownerOf(id), 'listing can be done only by owner');
		require(_lisERC721[addr][id].seller == address(0), 'item already listed');

		_lisERC721[addr][id] = LisERC721(id, price, msg.sender);

		_item.safeTransferFrom(msg.sender, address(this), id);

		if (id >= _maxCusIt[addr]) _maxCusIt[addr] = id + 1;

		emit Listed(addr, id, msg.sender, 1, price);
	}

	function buyERC721(address addr, uint256 id) public {
		require(tokenAccepted(addr), 'token not accepted');
		LisERC721 storage listing = _lisERC721[addr][id];
		CustomItem _item = CustomItem(addr);

		require(listing.seller != address(0), 'listing is not active');
		require(msg.sender != listing.seller, 'seller cannot be buyer');

		uint256 userAm = _lisERC721[addr][id].price - ((_lisERC721[addr][id].price * ((_lisFee * 1 ether) / 1000)) / 1 ether);

		_mzt.transferFrom(msg.sender, address(this), listing.price);
		_mzt.transfer(listing.seller, userAm);

		_item.safeTransferFrom(address(this), msg.sender, id);

		delete _lisERC721[addr][id];

		emit Sold(addr, id, msg.sender, 1, listing.price);
	}

	function cancelERC721(address addr, uint256 id) public {
		require(tokenAccepted(addr), 'token not accepted');
		LisERC721 storage listing = _lisERC721[addr][id];
		CustomItem _item = CustomItem(addr);

		require(listing.seller != address(0), 'listing is not active');
		require(msg.sender == listing.seller, 'only seller can cancel listing');

		_item.safeTransferFrom(address(this), msg.sender, id);

		delete _lisERC721[addr][id];

		emit Unlisted(addr, id, msg.sender);
	}

	function getERC721Listing(address addr, uint256 id) public view returns (LisERC721 memory) {
		return _lisERC721[addr][id];
	}

	function listingsERC721(address addr) public view returns (LisERC721[] memory) {
		require(tokenAccepted(addr), 'token not accepted');

		uint256 n = 0;
		for (uint256 i = 0; i < _maxIt[addr]; i++) {
			if (_lisERC721[addr][i].seller != address(0)) {
				n++;
			}
		}

		LisERC721[] memory ret = new LisERC721[](n);
		uint256 current = 0;
		for (uint256 i = 0; i < _maxIt[addr]; i++) {
			if (_lisERC721[addr][i].seller != address(0)) {
				ret[current] = _lisERC721[addr][i];
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
		_lisFee = amount;
	}

	function isSeller(
		address addr,
		uint256 id,
		address seller
	) public view returns (bool) {
		if (_lisERC1155[addr][id].sellers.length > 0) {
			for (uint256 i = 0; i < _lisERC1155[addr][id].sellers.length; i++) {
				if (_lisERC1155[addr][id].sellers[i] == seller) return true;
			}
		}
		return false;
	}

	function getSellerIndex(
		address addr,
		uint256 id,
		address seller
	) public view returns (uint256) {
		require(isSeller(addr, id, seller), 'seller did not list this item');

		for (uint256 i = 0; i < _lisERC1155[addr][id].sellers.length; i++) {
			if (_lisERC1155[addr][id].sellers[i] == seller) return i;
		}

		return 0;
	}

	function isAdmin(address account) public view returns (bool) {
		for (uint256 i = 0; i < _adm.length; i++) {
			if (_adm[i] == account) return true;
		}
		return false;
	}

	function setAdmins(address[] memory admins) public {
		require(isAdmin(msg.sender), 'admin only');
		_adm = admins;
	}

	function tokenAccepted(address token) public view returns (bool) {
		for (uint256 i = 0; i < _acceptdTokens.length; i++) {
			if (_acceptdTokens[i] == token) return true;
		}
		return false;
	}

	function setAcceptedTokens(address[] memory tokens) public {
		require(isAdmin(msg.sender), 'admin only');
		_acceptdTokens = tokens;
	}
}
