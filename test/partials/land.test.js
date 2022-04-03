const { ethers } = require('hardhat');
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');

const test = l => {
	const length = l ?? 3;
	return () => {
		it('mint land', async () => {
			await Promise.all(
				Array.from({ length }, (v, k) => k).map(async x => {
					await Promise.all(
						Array.from({ length }, (v, k) => k).map(async y => {
							await land.mint(x, y);

							const coordinates = await land._coordinates(x, y);

							expect(coordinates.minted).to.equal(true);
							expect(parseInt(ethers.utils.formatUnits(coordinates.id, 0))).to.equal(x * length + y);

							expectRevert(land.mint(x, y), 'land already minted');
						})
					);
				})
			);

			expect((await land._coordinates(length + 1, length + 1)).minted).to.equal(false);
			expect(ethers.utils.formatUnits((await land._coordinates(length + 1, length + 1)).id, 0)).to.equal('0');
		});
	};
};

module.exports = test;
