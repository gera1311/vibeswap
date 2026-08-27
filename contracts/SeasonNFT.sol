// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ISeasonGame {
    function daysPlayed(address user) external view returns (uint256);
    function getRank(address user) external view returns (uint256);
}

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);

        uint256 i = 0;
        uint256 j = 0;

        while (i + 3 <= len) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            uint256 c = uint256(uint8(data[i + 2]));

            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[((a & 3) << 4) | (b >> 4)];
            result[j + 2] = TABLE[((b & 15) << 2) | (c >> 6)];
            result[j + 3] = TABLE[c & 63];

            i += 3;
            j += 4;
        }

        uint256 remaining = len - i;
        if (remaining == 1) {
            uint256 a = uint256(uint8(data[i]));
            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[(a & 3) << 4];
            result[j + 2] = "=";
            result[j + 3] = "=";
        } else if (remaining == 2) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[((a & 3) << 4) | (b >> 4)];
            result[j + 2] = TABLE[(b & 15) << 2];
            result[j + 3] = "=";
        }

        return string(result);
    }
}

// SeasonNFT is the soulbound "Season 0 Participant" memorial badge. It is free
// to mint, one per wallet, and requires the wallet to have played at least
// `minDaysPlayed` distinct UTC days in the season (verified onchain via
// SeasonGame.daysPlayed). There is no transfer function, so tokens are
// permanently bound to the minter.
contract SeasonNFT {
    string public constant name = "Vibeswap Season 0 Participant";
    string public constant symbol = "VS0";

    ISeasonGame public immutable game;
    uint256 public immutable seasonId;
    uint256 public immutable minDaysPlayed;
    uint256 public immutable mintDeadline;

    uint256 public totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => bool) private _minted;
    mapping(uint256 => uint256) private _tokenDaysPlayed;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Mint(address indexed user, uint256 tokenId, uint256 daysPlayed);

    constructor(address game_, uint256 seasonId_, uint256 minDaysPlayed_, uint256 mintDeadline_) {
        require(game_ != address(0), "Game is zero");
        require(minDaysPlayed_ > 0, "Days is zero");
        require(mintDeadline_ > 0, "Deadline is zero");

        game = ISeasonGame(game_);
        seasonId = seasonId_;
        minDaysPlayed = minDaysPlayed_;
        mintDeadline = mintDeadline_;
    }

    function mint() external {
        require(!_minted[msg.sender], "Already minted");
        require(block.timestamp <= mintDeadline, "Mint deadline passed");

        uint256 daysValue = game.daysPlayed(msg.sender);
        require(daysValue >= minDaysPlayed, "Not enough days played");

        _minted[msg.sender] = true;
        totalSupply += 1;

        uint256 tokenId = totalSupply;
        _owners[tokenId] = msg.sender;
        _balances[msg.sender] += 1;
        _tokenDaysPlayed[tokenId] = daysValue;

        emit Transfer(address(0), msg.sender, tokenId);
        emit Mint(msg.sender, tokenId, daysValue);
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Nonexistent token");
        return owner;
    }

    function hasMinted(address user) external view returns (bool) {
        return _minted[user];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");

        address owner = _owners[tokenId];
        uint256 daysValue = _tokenDaysPlayed[tokenId];
        uint256 rank = game.getRank(owner);
        string memory rankText = rank == 0 ? "Unranked" : string.concat("#", _toString(rank));

        string memory json = string.concat(
            '{"name":"Vibeswap Season 0 Participant #',
            _toString(tokenId),
            '","description":"Soulbound proof of participating in Vibeswap Season 0 (Sep 1 - Sep 30, 2026) with at least ',
            _toString(minDaysPlayed),
            ' days played.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_svg(daysValue, rankText))),
            '","attributes":[{"trait_type":"Season","value":',
            _toString(seasonId),
            '},{"trait_type":"Days Played","value":',
            _toString(daysValue),
            '},{"trait_type":"Rank","value":"',
            rankText,
            '"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _svg(uint256 daysValue, string memory rankText) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0%" stop-color="#9E7FFF"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs>',
            '<rect width="512" height="512" rx="64" fill="url(#g)"/>',
            '<text x="256" y="180" font-size="34" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Vibeswap</text>',
            '<text x="256" y="250" font-size="66" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Season 0</text>',
            '<text x="256" y="300" font-size="24" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Sep 1 - Sep 30, 2026</text>',
            '<text x="256" y="360" font-size="28" fill="#ffffff" text-anchor="middle" font-family="sans-serif">',
            _toString(daysValue),
            ' days played</text>',
            '<text x="256" y="410" font-size="24" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Rank: ',
            rankText,
            '</text></svg>'
        );
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits += 1;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
