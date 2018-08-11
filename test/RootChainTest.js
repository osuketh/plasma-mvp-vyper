const utils = require("ethereumjs-util");
const { latestTime } = require('./helpers/latestTime');
const { increaseTimeTo, duration } = require('./helpers/increaseTime');
const { EVMRevert } = require('./helpers/EVMRevert');
const { expectThrow } = require('./helpers/expectThrow');


const RootChain = artifacts.require("root_chain.vyper");
const PriorityQueue = artifacts.require("priority_queue.vyper");

const rlp = utils.rlp;
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();


contract("RootChain", ([owner, nonOwner, priorityQueueAddr]) => {
    const depositAmount = new BigNumber(web3.toWei(0.1, 'ether'));
    const depositAmountNum = Number(depositAmount);
    const utxoOrder = new BigNumber(1000000000);
    const num1 = new BigNumber(1);
    const num2 = new BigNumber(2);

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    beforeEach(async () => {
        this.rootChain = await RootChain.new(priorityQueueAddr, { from: owner });
    });

    describe("submitBlock", () => {
        it("should update block numbers", async () => {

        });
    });

    describe("deposit", () => {
        it("should accespt deposit", async () => {
            const blknum = await this.rootChain.getDepositBlock();
            await this.rootChain.deposit({ value: depositAmount, from: owner });
            const depositBlockNum = await this.rootChain.getDepositBlock();
            depositBlockNum.should.be.bignumber.equal(blknum.plus(num1));
        })
    });

    describe("startDepositExit", () => {
        beforeEach(async () => {
            await this.rootChain.deposit({ depositAmount, from: owner });
            this.blknum = await this.rootChain.getDepositBlock();
            await this.rootChain.deposit({ depositAmount, from: owner });
            this.expectedUtxoPos = this.blknum.mul(utxoOrder);
        })

        it("should be equal utxoPos and exitableAt ", async () => {
            const expectedExitableAt = (await latestTime()) + duration.weeks(2);

            await this.rootChain.startDepositExit(this.expectedUtxoPos, ZERO_ADDRESS, depositAmountNum);
            const [utxoPos, exitableAt] = await this.rootChain.getNextExit(ZERO_ADDRESS);

            utxoPos.should.be.bignumber.equal(this.expectedUtxoPos);
            exitableAt.should.be.bignumber.equal(expectedExitableAt);
            (await this.rootChain.getExit(utxoPos)).to.have.ordered.members([owner, ZERO_ADDRESS, depositAmount])
        });

        it("should fail if same deposit is exited twice", async () => {
            await this.rootChain.startDepositExit(this.expectedUtxoPos, ZERO_ADDRESS, depositAmountNum);
            await expectThrow(this.rootChain.startDepositExit(this.expectedUtxoPos, ZERO_ADDRESS, depositAmountNum), EVMRevert);
        });

        it("should fail if transaction sender is not the depositor", async () => {
            await expectThrow(this.rootChain.startDepositExit(this.expectedUtxoPos, ZERO_ADDRESS, depositAmountNum, { from: nonOwner }), EVMRevert);
        });

        it("should fail if utxoPos is worng", async () => {
            await expectThrow(this.rootChain.startDepositExit(this.expectedUtxoPos * 2, ZERO_ADDRESS, depositAmountNum), EVMRevert);
        });

        it("should fail if value given is not equal to deposited value", async () => {
            await expectThrow(this.rootChain.startDepositExit(this.expectedUtxoPos, ZERO_ADDRESS, depositAmountNum + 1), EVMRevert);
        })
    });

    describe("startFeeExit", () => {
        it("should be equal utxoPos and exitableAt", async () => {
            let [utxoPos, exitableAt];

            const blknum = await this.rootChain.getDepositBlock();
            await this.rootChain.deposit({ value: depositAmount, from: owner });
            const expectedUtxoAt = await this.rootChain.getCurrentFeeExit();
            const expectedExitableAt = (await latestTime()) + duration.weeks(2) + 1;

            (await this.rootChain.getCurrentFeeExit()).should.be.bignumber.equal(num1);
            await this.rootChain.startFeeExit(ZERO_ADDRESS, 1);
            (await this.rootChain.getCurrentFeeExit()).should.be.bignumber.equal(num2);

            [utxoPos, exitableAt] = await this.rootChain.getNextExit(ZERO_ADDRESS);
            const feePriority = exitableAt << 128 | utxoPos;

            utxoPos.should.be.bignumber.equal(expectedUtxoAt);
            exitableAt.should.be.bignumber.equal(expectedExitableAt);

            const expectedUtxoPos = blknum.mul(utxoOrder).plus(num1);
            await this.rootChain.startDepositExit(expectedUtxoPos, ZERO_ADDRESS, depositAmount);

            [utxoPos, exitableAt] = await this.rootChain.getNextExit(ZERO_ADDRESS);
            const depositPriotiy = exitableAt << 128 | utxoPos;
            feePriority.to.be.above(depositPriotiy);

            await expectThrow(this.rootCHain.startFeeExit(ZERO_ADDRESS, 1, { from: nonOwner }), EVMRevert);
        });

        it("feePriority should be larger than depositPriority", async () => {

        });

        it("should fail if transaction sender isn't the authority", async () => {

        });

    });

    describe("startExit", () => {

    });

    describe("challengeExit", () => {

    });

    describe("finalizeExits", () => {

    });
});
