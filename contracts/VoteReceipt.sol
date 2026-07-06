// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VoteReceipt is ERC721, Ownable {
    address public minter;
    uint256 private _nextId;

    event MinterUpdated(address indexed previousMinter, address indexed newMinter);

    constructor(address initialOwner) ERC721("I Voted Receipt", "IVOTED") Ownable(initialOwner) {}

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "Receipt: zero minter");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    function mint(address to) external returns (uint256) {
        require(msg.sender == minter, "Receipt: not minter");
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Receipt: soulbound");
        return super._update(to, tokenId, auth);
    }
}
