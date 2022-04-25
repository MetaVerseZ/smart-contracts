const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_BYTES32 } = require('@openzeppelin/test-helpers/src/constants');
// const { create, urlSource } = require('ipfs-http-client');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const test = () => {
	const length = random(5, 10);
	const amount = 12;
	const testItemPrice = ethers.utils.parseUnits('500', 'ether');

	// const ipfs = create({ silent: true });
	// const gateway = 'http://ipfs.io/ipfs';

	it('mint and list items', async () => {
		await Promise.all(
			Array.from({ length }, (v, k) => k).map(async id => {
				// const metadata = {
				// 	id,
				// 	name: `item ${id}`,
				// 	description: 'some description',
				// 	image: (await ipfs.add(urlSource('https://picsum.photos/64'))).cid.toString(),
				// };

				// const { cid } = await ipfs.add(JSON.stringify(metadata));
				// const uri = `${gateway}/${cid}`;

				const amount = Math.ceil(Math.random() * 100) + 20;
				const price = ethers.utils.parseEther((Math.ceil(Math.random() * 1000) + 20).toString());

				await item.mint(amount);

				await erc1155market.list(item.address, id, price, amount);

				const listing = await erc1155market.listing(item.address, id);

				expect(listing.sellers).to.include(main.address);

				const index = listing.sellers.indexOf(main.address);
				expect(ethers.utils.formatUnits(listing.amounts[index], 0)).to.equal(amount.toString());
			})
		);

		const listings = await erc1155market.listings(item.address);
		expect(listings.length).to.equal(length);
	});

	it('buy item', async () => {
		const initialMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(erc1155market.address)));

		const listing = await erc1155market.listing(item.address, 0);
		const amounts = listing.amounts.reduce((acc, b) => (acc += parseInt(ethers.utils.formatUnits(b, 0))), 0);

		await token.connect(buyer).approve(erc1155market.address, ethers.utils.parseEther('' + parseFloat(ethers.utils.formatEther(listing.price)) * amount));
		await erc1155market.connect(buyer).buy(item.address, listing.id, amount);
		const updatedListing = await erc1155market.listing(item.address, listing.id);
		const updatedamounts = updatedListing.amounts.reduce((acc, b) => (acc += parseInt(ethers.utils.formatUnits(b, 0))), 0);

		expect(amounts - updatedamounts).to.equal(amount);
		expect(ethers.utils.formatUnits(await item.balanceOf(buyer.address, listing.id), 0)).to.equal(amount.toString());

		const updatedMarketBalance = parseFloat(ethers.utils.formatEther(await token.balanceOf(erc1155market.address)));
		expect(updatedMarketBalance - initialMarketBalance - parseFloat(ethers.utils.formatEther(listing.price)) * amount * (parseFloat(ethers.utils.formatUnits(await erc1155market._lisFee(), 0)) / 1000)).to.be.below(0.00005);
	});

	it('list item again after buying', async () => {
		const approved = await item.isApprovedForAll(buyer.address, erc1155market.address);
		if (!approved) {
			await item.connect(buyer).setApprovalForAll(erc1155market.address, true);
		}
		await erc1155market.connect(buyer).list(item.address, 0, testItemPrice, amount - 2);
		const listing = await erc1155market.listing(item.address, 0);
		expect(listing.sellers).to.include(buyer.address);

		const index = listing.sellers.indexOf(buyer.address);
		expect(parseInt(ethers.utils.formatUnits(listing.amounts[index], 0))).to.equal(amount - 2);
		const listings = await erc1155market.listings(item.address);
		expect(listings.length).to.equal(length);
	});

	it('cancel item listing', async () => {
		const id = parseInt(ethers.utils.formatUnits(await item._tokenId(), 0));

		await item.connect(admin).mint(amount + 10);
		await item.connect(admin).safeTransferFrom(admin.address, third.address, id, amount + 10, ZERO_BYTES32);

		const approved = await item.isApprovedForAll(third.address, erc1155market.address);
		if (!approved) {
			await item.connect(third).setApprovalForAll(erc1155market.address, true);
		}

		await erc1155market.connect(third).list(item.address, id, testItemPrice, amount + 10);

		const listing = await erc1155market.listing(item.address, id);
		expect(listing.sellers).to.include(third.address);

		await erc1155market.connect(third).unlist(item.address, id);
		const updatedListing = await erc1155market.listing(item.address, id);
		expect(updatedListing.sellers.length).to.equal(0);
		expect(updatedListing.amounts.length).to.equal(0);
		expect(parseInt(ethers.utils.formatUnits(await item.balanceOf(third.address, id), 0))).to.equal(amount + 10);
	});

	it('cannot list an item owned by someone else', async () => {
		await item.connect(admin).mint(1);

		await expectRevert(erc1155market.list(item.address, parseInt(ethers.utils.formatUnits(await item._tokenId(), 0)) - 1, testItemPrice, 1), 'listing can be done only by owner');
	});

	it('cannot cancel an item owned by someone else', async () => {
		await expectRevert(erc1155market.connect(third).unlist(item.address, 0), 'only seller can cancel listing');
	});

	it('cannot buy an owned item', async () => {
		await expectRevert(erc1155market.buy(item.address, 1, 1), 'seller cannot be buyer');
	});

	it('number of listings', async () => {
		expect((await erc1155market.listings(item.address)).length).to.equal(length);
	});

	it('unlist items', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await erc1155market.unlist(item.address, id);
				const listing = await erc1155market.listing(item.address, id);
				expect(listing.sellers.length).to.equal(0);
			})
		);
	});

	it('list again', async () => {
		const listings = Array.from({ length: 2 }, (v, k) => k + 5);

		await Promise.all(
			listings.map(async id => {
				await erc1155market.list(item.address, id, ethers.utils.parseEther('100'), 10);
				const listing = await erc1155market.listing(item.address, id);
				expect(listing.sellers).to.include(main.address);
			})
		);
	});

	it('cannot list an item that is not minted/owned', async () => {
		expectRevert(erc1155market.list(item.address, 22, ethers.utils.parseUnits('5000', 'ether'), 10), 'listing can be done only by owner');
	});
};

module.exports = test;
