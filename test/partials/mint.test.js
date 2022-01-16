const { ethers } = require('hardhat');
const { expect } = require('chai');
// const { create, urlSource } = require('ipfs-http-client');

const test = length => {
	const IDS = Array.from({ length: length ?? 2 }, (v, k) => k);

	return () => {
		before(async () => (listingFee = (await market._listingFee()).toString()));
		const testItemPrice = ethers.utils.parseUnits('5000', 'ether');

		// const ipfs = create({ silent: true });
		// const gateway = 'http://ipfs.io/ipfs';

		it('mint and list items', async () => {
			await Promise.all(
				IDS.map(async id => {
					// const metadata = {
					// 	id,
					// 	name: `item ${id}`,
					// 	description: 'some description',
					// 	image: (await ipfs.add(urlSource('https://picsum.photos/64'))).cid.toString(),
					// };

					// const { cid } = await ipfs.add(JSON.stringify(metadata));
					// const uri = `${gateway}/${cid}`;
					const uri = `https://www.example.com/${id}`;

					await item.mint(uri);
					await token.approve(market.address, listingFee);
					await market.listToken(id, testItemPrice);

					const listing = await market.getListing(id);
					expect(listing.status).to.equal(0);

					expect(await item.tokenURI(id)).to.equal(uri);
				})
			);
			const listings = await market.getAllListings();
			expect(listings.length).to.equal(IDS.length);
		});
	};
};

module.exports = test;
