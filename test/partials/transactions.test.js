const { ethers } = require('hardhat');
const { expect } = require('chai');

const test = () => {
	before(async () => (listingFee = (await market._listingFee()).toString()));
	const testItemPrice = ethers.utils.parseUnits('5000', 'ether');

	it('buy item', async () => {
		const listing = await market.getListing(0);
		await token.connect(buyer).approve(market.address, listing.price);
		await market.connect(buyer).buyToken(listing.id);
		const updatedListing = await market.getListing(listing.id);
		expect(updatedListing.owner).to.equal(buyer.address);
		expect(updatedListing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listToken(0, testItemPrice);
		const listing = await market.getListing(0);
		expect(listing.status).to.equal(0);
		const listings = await market.getAllListings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const initialBalance = await token.balanceOf(main.address);

		const ID = 2;
		await item.mint('http://example.com/3');
		await market.listToken(ID, testItemPrice);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance) + ethers.utils.formatEther(listingFee)));

		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.status).to.equal(1);

		expect(parseFloat(ethers.utils.formatEther(await token.balanceOf(main.address))), parseFloat(ethers.utils.formatEther(initialBalance)));
	});

	it('check owned items', async () => {
		const mainOwnedItems = (await item.getAccountItems(main.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		const buyerOwnedItems = (await item.getAccountItems(buyer.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		expect(mainOwnedItems.length).to.equal(2);
		expect(buyerOwnedItems.length).to.equal(1);
		expect(mainOwnedItems.every(item => [1, 2].includes(item)) && [1, 2].every(item => mainOwnedItems.includes(item))).to.equal(true);
		expect(buyerOwnedItems.every(item => [0].includes(item)) && [0].every(item => buyerOwnedItems.includes(item))).to.equal(true);
	});

	it('cannot list a token owned by someone else', async () => {
		try {
			await market.listToken(1, testItemPrice);
		} catch (error) {
			expect(error.message.includes('listing can be done only by owner')).to.equal(true);
		}
	});

	it('cannot cancel a token owned by someone else', async () => {
		try {
			await market.connect(buyer).cancel(1);
		} catch (error) {
			expect(error.message.includes('only owner can cancel listing')).to.equal(true);
		}
	});

	it('cannot buy an owned item', async () => {
		try {
			await market.buyToken(1);
		} catch (error) {
			expect(error.message.includes('owner cannot be buyer')).to.equal(true);
		}
	});

	it('cannot buy an inactive item', async () => {
		try {
			await market.connect(buyer).buyToken(2);
		} catch (error) {
			expect(error.message.includes('listing is not active')).to.equal(true);
		}
	});

	it('catch insufficient listing fee', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await item.connect(account).mint(`http://example.com/4`);
			await market.connect(account).listToken(3, testItemPrice);
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low for listing fee')).to.equal(true);
		}
	});

	it('catch low balance for buy payment', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low')).to.equal(true);
		}
	});
};

module.exports = test;
