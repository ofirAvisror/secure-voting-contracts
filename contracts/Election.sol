// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

interface IVoteReceipt {
    function mint(address to) external returns (uint256);
}

contract Election is Ownable {
    uint256 public constant TOPICS = 3;

    struct Candidate {
        string name;
        uint8[3] positions;
        uint256 voteCount;
    }

    Candidate[] private candidates;

    bytes32 public voterMerkleRoot;
    string public voterBookCid;

    uint64 public votingStart;
    uint64 public votingEnd;

    IRewardToken public rewardToken;
    IVoteReceipt public voteReceipt;
    uint256 public rewardAmount;

    mapping(address => bool) public hasVoted;
    uint256 public totalVotes;

    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoterBookUpdated(bytes32 merkleRoot, string ipfsCid);
    event VotingWindowSet(uint64 start, uint64 end);
    event Voted(address indexed voter, uint256 tokenId);

    constructor(
        address rewardToken_,
        address voteReceipt_,
        uint256 rewardAmount_,
        address initialOwner
    ) Ownable(initialOwner) {
        rewardToken = IRewardToken(rewardToken_);
        voteReceipt = IVoteReceipt(voteReceipt_);
        rewardAmount = rewardAmount_;
    }

    function addCandidate(string calldata name, uint8[3] calldata positions) external onlyOwner {
        require(votingStart == 0 || block.timestamp < votingStart, "Election: voting configured");
        for (uint256 i = 0; i < TOPICS; i++) {
            require(positions[i] >= 1 && positions[i] <= 5, "Election: position out of range");
        }
        candidates.push(Candidate({name: name, positions: positions, voteCount: 0}));
        emit CandidateAdded(candidates.length - 1, name);
    }

    function setVoterBook(bytes32 merkleRoot, string calldata ipfsCid) external onlyOwner {
        require(merkleRoot != bytes32(0), "Election: empty root");
        voterMerkleRoot = merkleRoot;
        voterBookCid = ipfsCid;
        emit VoterBookUpdated(merkleRoot, ipfsCid);
    }

    function setVotingWindow(uint64 start, uint64 end) external onlyOwner {
        require(start < end, "Election: bad window");
        require(end > block.timestamp, "Election: end in past");
        votingStart = start;
        votingEnd = end;
        emit VotingWindowSet(start, end);
    }

    function votingOpen() public view returns (bool) {
        return votingStart != 0 && block.timestamp >= votingStart && block.timestamp <= votingEnd;
    }

    function voteDirect(uint256 candidateId, bytes32[] calldata proof) external {
        require(candidateId < candidates.length, "Election: invalid candidate");
        _checkEligibility(proof);
        _castVote(candidateId);
    }

    function voteByPreference(uint8[3] calldata answers, bytes32[] calldata proof) external {
        require(candidates.length > 0, "Election: no candidates");
        for (uint256 i = 0; i < TOPICS; i++) {
            require(answers[i] >= 1 && answers[i] <= 5, "Election: answer out of range");
        }
        _checkEligibility(proof);
        uint256 bestId = _nearestCandidate(answers);
        _castVote(bestId);
    }

    function _nearestCandidate(uint8[3] calldata answers) internal view returns (uint256) {
        uint256 bestId = 0;
        uint256 bestDistance = type(uint256).max;
        for (uint256 i = 0; i < candidates.length; i++) {
            uint256 distance = 0;
            for (uint256 t = 0; t < TOPICS; t++) {
                uint8 a = answers[t];
                uint8 b = candidates[i].positions[t];
                distance += a >= b ? uint256(a - b) : uint256(b - a);
            }
            if (distance < bestDistance) {
                bestDistance = distance;
                bestId = i;
            }
        }
        return bestId;
    }

    function _checkEligibility(bytes32[] calldata proof) internal view {
        require(votingOpen(), "Election: voting closed");
        require(!hasVoted[msg.sender], "Election: already voted");
        require(voterMerkleRoot != bytes32(0), "Election: no voter book");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, voterMerkleRoot, leaf), "Election: not eligible");
    }

    function _castVote(uint256 candidateId) internal {
        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;
        totalVotes += 1;
        if (rewardAmount > 0) {
            rewardToken.mint(msg.sender, rewardAmount);
        }
        uint256 tokenId = voteReceipt.mint(msg.sender);
        emit Voted(msg.sender, tokenId);
    }

    function candidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 candidateId)
        external
        view
        returns (string memory name, uint8[3] memory positions, uint256 voteCount)
    {
        Candidate storage c = candidates[candidateId];
        return (c.name, c.positions, c.voteCount);
    }

    function getCandidates()
        external
        view
        returns (string[] memory names, uint256[] memory votes)
    {
        uint256 n = candidates.length;
        names = new string[](n);
        votes = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            names[i] = candidates[i].name;
            votes[i] = candidates[i].voteCount;
        }
    }

    function getResultsSorted()
        external
        view
        returns (uint256[] memory rankedIds, string[] memory names, uint256[] memory votes)
    {
        uint256 n = candidates.length;
        rankedIds = new uint256[](n);
        names = new string[](n);
        votes = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            rankedIds[i] = i;
        }
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                uint256 a = rankedIds[i];
                uint256 b = rankedIds[j];
                if (candidates[b].voteCount > candidates[a].voteCount) {
                    rankedIds[i] = b;
                    rankedIds[j] = a;
                }
            }
        }
        for (uint256 i = 0; i < n; i++) {
            names[i] = candidates[rankedIds[i]].name;
            votes[i] = candidates[rankedIds[i]].voteCount;
        }
    }

    function getWinner()
        external
        view
        returns (uint256 winnerId, string memory name, uint256 voteCount)
    {
        require(candidates.length > 0, "Election: no candidates");
        uint256 bestId = 0;
        for (uint256 i = 1; i < candidates.length; i++) {
            if (candidates[i].voteCount > candidates[bestId].voteCount) {
                bestId = i;
            }
        }
        return (bestId, candidates[bestId].name, candidates[bestId].voteCount);
    }
}
