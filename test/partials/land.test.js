const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const test = () => {
	const length = random(5, 10);
	const testItemPrice = ethers.utils.parseUnits('100', 'ether');

	it('mint and list land', async () => {
		await Promise.all(
			Array.from({ length }, (v, k) => k).map(async x => {
				await Promise.all(
					Array.from({ length }, (v, k) => k).map(async y => {
						await land.connect(admin).mint(x, y);

						const item = await land._items(x, y);

						expect(item.minted).to.equal(true);
						expect(parseInt(ethers.utils.formatUnits(item.id, 0))).to.equal(x * length + y);

						const coordinates = await land._coordinates(item.id);
						expect(coordinates.x).to.equal(x);
						expect(coordinates.y).to.equal(y);

						await landmarket.connect(admin).list(item.id, ethers.utils.parseEther((Math.ceil(Math.random() * 100) + 100).toString()));

						expectRevert(land.mint(x, y), 'land already minted');
					})
				);
			})
		);

		expect((await land._items(length + 1, length + 1)).minted).to.equal(false);
		expect(ethers.utils.formatUnits((await land._items(length + 1, length + 1)).id, 0)).to.equal('0');
	});

	it('buy land', async () => {
		const initialMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(landmarket.address)));

		const listing = await landmarket.listing(0);
		const listings = await landmarket.listings();

		await token.connect(buyer).approve(landmarket.address, listing.price);
		await landmarket.connect(buyer).buy(listing.id);
		const updatedListing = await landmarket.listing(listing.id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(listing.id)).to.equal(buyer.address);

		const updatedMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(landmarket.address)));
		expect(updatedMarketBalance - initialMarketBalance - parseFloat(ethers.utils.formatEther(listing.price)) * (parseFloat(ethers.utils.formatUnits(await landmarket._lisFee(), 0)) / 1000)).to.be.below(0.00005);

		const newListings = await landmarket.listings();
		expect(newListings.length).to.equal(listings.length - 1);
	});

	it('list land again after buying', async () => {
		const listings = await landmarket.listings();

		const approved = await land.isApprovedForAll(buyer.address, landmarket.address);
		if (!approved) {
			await land.connect(buyer).setApprovalForAll(landmarket.address, true);
		}

		await landmarket.connect(buyer).list(0, testItemPrice);
		const listing = await landmarket.listing(0);
		expect(listing.seller).to.equal(buyer.address);

		const newListings = await landmarket.listings();
		expect(newListings.length).to.equal(listings.length + 1);
	});

	it('cancel land listing', async () => {
		const id = parseInt(ethers.utils.formatUnits(await land._tokenId(), 0));

		await land.connect(admin).mint(255, 255);
		await land.connect(admin)['safeTransferFrom(address,address,uint256)'](admin.address, third.address, id);

		const approved = await land.isApprovedForAll(third.address, landmarket.address);
		if (!approved) {
			await land.connect(third).setApprovalForAll(landmarket.address, true);
		}

		await landmarket.connect(third).list(id, testItemPrice);

		const listing = await landmarket.listing(id);
		expect(listing.seller).to.equal(third.address);

		await landmarket.connect(third).unlist(id);
		const updatedListing = await landmarket.listing(id);

		expect(updatedListing.seller).to.equal(ZERO_ADDRESS);
		expect(await land.ownerOf(id)).to.equal(third.address);
	});

	it('cannot list land owned by someone else', async () => {
		await expectRevert(landmarket.list(4, testItemPrice), 'listing can be done only by owner');
	});

	it('cannot cancel a land owned by someone else', async () => {
		await expectRevert(landmarket.connect(third).unlist(1), 'only seller can cancel listing');
	});

	it('cannot buy an owned land', async () => {
		await expectRevert(landmarket.connect(admin).buy(1), 'seller cannot be buyer');
	});

	it('batch mint', async () => {
		const Land = await ethers.getContractFactory('Land');
		const land = await Land.deploy();
		await land.deployed();
		await land.setMarket(landmarket.address);

		await land.batchMint(0, 2, 3);
		expectRevert(land.batchMint(0, 2, 2), 'land already minted');
		expect(ethers.utils.formatUnits(await land._tokenId(), 0)).to.equal('12');
	});

	it('map', async () => {		
		const Land = await ethers.getContractFactory('Land');
		const land = await Land.deploy();
		await land.deployed();
		await land.setMarket(landmarket.address);

		const matrixLength = 16;
		const matrix = Array.from({ length: matrixLength }, () => Array.from({ length: matrixLength }, () => Math.random() > 0.7));

		await Promise.all(matrix.map(async (arr, x) => await Promise.all(arr.map(async (e, y) => e && (await land.mint(x, y))))));

		const map = (await land.map()).map(e => ({ owner: e.owner, x: e.x, y: e.y }));
		expect(map.length).to.equal([].concat(...matrix).filter(e => e).length);

		const matrixFromMap = Array.from({ length: matrixLength }, () => Array.from({ length: matrixLength }, () => {}));

		map.forEach(e => (matrixFromMap[e.x][e.y] = e.owner));

		matrixFromMap.forEach((array, x) => {
			array.forEach((item, y) => {
				expect(!!item).to.equal(matrix[x][y])
			});
		});
	});
};

module.exports = test;
