// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// nft that gets sent to voters as proof they voted, soulbound so it cant be traded away
contract VoteReceipt is ERC721, Ownable {
    address public minter;
    uint256 private _nextId;

    event MinterUpdated(
        address indexed previousMinter,
        address indexed newMinter
    );

    // sets the nft name and symbol and records who the owner is
    constructor(
        address initialOwner
    ) ERC721("I Voted Receipt", "IVOTED") Ownable(initialOwner) {}

    // owner calls this once after deploy to let the election contract mint receipts
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Receipt: zero minter");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    // mints one receipt nft to the voter and returns the token id, only the minter can call this
    function mint(address to) external returns (uint256) {
        require(msg.sender == minter, "Receipt: not minter");
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    // overrides the transfer hook to block any transfer, only minting and burning are allowed
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Receipt: soulbound");
        return super._update(to, tokenId, auth);
    }
}
