package io.dartchain.backend.service;

import io.dartchain.backend.blockchain.store.BlockchainStateStore;
import io.dartchain.backend.dto.BlockValidationResult;
import io.dartchain.backend.dto.StatsResponse;
import io.dartchain.backend.exception.InvalidBlockException;
import io.dartchain.backend.model.Block;
import io.dartchain.backend.model.PendingTransaction;
import io.dartchain.backend.model.Transaction;
import io.dartchain.backend.showcase.service.MarketChartService;
import io.dartchain.backend.ops.ApplicationMetricsCollector;
import io.dartchain.backend.utils.CryptoUtils;
import io.dartchain.backend.utils.HashUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class BlockchainService {

    private final List<Block> blockchain = new ArrayList<>();
    private final BlockchainStateStore blockchainStateStore;
    private final BlockchainValidationService validationService;
    private final MarketChartService marketChartService;
    private final TransactionPoolService transactionPoolService;
    private final ApplicationMetricsCollector metricsCollector;

    private static final int DIFFICULTY = 4;
    private static final BigDecimal MINING_REWARD = new BigDecimal("10.0");

    public BlockchainService(
            BlockchainStateStore blockchainStateStore,
            BlockchainValidationService validationService,
            MarketChartService marketChartService,
            TransactionPoolService transactionPoolService,
            ApplicationMetricsCollector metricsCollector
    ) {
        this.blockchainStateStore = blockchainStateStore;
        this.validationService = validationService;
        this.marketChartService = marketChartService;
        this.transactionPoolService = transactionPoolService;
        this.metricsCollector = metricsCollector;
    }

    @PostConstruct
    public void loadFromStore() {
        synchronized (this) {
            blockchain.clear();
            List<Block> loaded = blockchainStateStore.load().getBlocks();
            if (loaded == null || loaded.isEmpty()) {
                blockchain.add(createGenesisBlock());
                persistBlocks();
            } else {
                blockchain.addAll(loaded);
            }
        }
    }

    public synchronized List<Block> getBlocks() {
        return List.copyOf(blockchain);
    }

    public synchronized List<Block> getChain() {
        return List.copyOf(blockchain);
    }

    public synchronized List<Transaction> getPendingTransactions() {
        return transactionPoolService.getPendingOnly().stream()
                .map(TransactionPoolService::toTransaction)
                .toList();
    }

    public synchronized Block getLatestBlock() {
        return blockchain.get(blockchain.size() - 1);
    }

    public synchronized Block findBlockByIndex(int index) {
        return blockchain.stream()
                .filter(block -> block.getIndex() == index)
                .findFirst()
                .orElse(null);
    }

    private Block createGenesisBlock() {
        Block genesisBlock = new Block();
        genesisBlock.setIndex(0);
        genesisBlock.setTimestamp(0L);
        genesisBlock.setData("Genesis Block");
        genesisBlock.setTransactions(new ArrayList<>());
        genesisBlock.setPreviousHash("0");
        genesisBlock.setNonce(0);
        genesisBlock.setDifficulty(DIFFICULTY);
        genesisBlock.setHash(calculateHash(genesisBlock));
        return genesisBlock;
    }

    public synchronized String calculateHash(Block block) {
        StringBuilder txBuilder = new StringBuilder();

        if (block.getTransactions() != null) {
            for (Transaction tx : block.getTransactions()) {
                txBuilder.append(tx.getId())
                        .append(tx.getSender())
                        .append(tx.getRecipient())
                        .append(tx.getAmount() != null ? tx.getAmount().toPlainString() : "0")
                        .append(tx.getTimestamp())
                        .append(tx.getSignature());
            }
        }

        String input = block.getIndex()
                + String.valueOf(block.getTimestamp())
                + String.valueOf(block.getData())
                + txBuilder
                + block.getPreviousHash()
                + block.getNonce()
                + block.getDifficulty();

        return HashUtils.sha256(input);
    }

    private String getDifficultyPrefix() {
        return "0".repeat(DIFFICULTY);
    }

    private void mine(Block block) {
        String target = getDifficultyPrefix();

        while (!calculateHash(block).startsWith(target)) {
            block.setNonce(block.getNonce() + 1);
        }

        block.setHash(calculateHash(block));
    }

    public synchronized Block addBlock(String data) {
        Block previousBlock = getLatestBlock();

        Block newBlock = new Block();
        newBlock.setIndex(previousBlock.getIndex() + 1);
        newBlock.setTimestamp(System.currentTimeMillis());
        newBlock.setData(data);
        newBlock.setTransactions(new ArrayList<>());
        newBlock.setPreviousHash(previousBlock.getHash());
        newBlock.setNonce(0);
        newBlock.setDifficulty(DIFFICULTY);

        mine(newBlock);

        BlockValidationResult validation = validationService.validateBlockAgainstChain(newBlock, blockchain);
        if (!validation.isValid()) {
            throw new InvalidBlockException(validation.getMessage());
        }

        blockchain.add(newBlock);
        marketChartService.recordBlockMined();
        persistBlocks();
        metricsCollector.recordBlockMined("index=" + newBlock.getIndex());
        return newBlock;
    }

    public synchronized Block mineBlock(String data) {
        return addBlock(data);
    }

    public synchronized Transaction addTransaction(Transaction transaction, String senderPublicKeyBase64) {
        if (transaction == null) {
            throw new RuntimeException("Transaction invalide");
        }

        if (transaction.getSender() == null || transaction.getSender().isBlank()) {
            throw new RuntimeException("Sender obligatoire");
        }

        if (transaction.getRecipient() == null || transaction.getRecipient().isBlank()) {
            throw new RuntimeException("Recipient obligatoire");
        }

        if (transaction.getAmount() == null || transaction.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Le montant doit être supérieur à 0");
        }

        if (transaction.getTimestamp() == null || transaction.getTimestamp() <= 0) {
            transaction.setTimestamp(System.currentTimeMillis());
        }

        if (transaction.getId() == null || transaction.getId().isBlank()) {
            transaction.setId(UUID.randomUUID().toString());
        }

        if (!"SYSTEM".equals(transaction.getSender())) {
            if (senderPublicKeyBase64 == null || senderPublicKeyBase64.isBlank()) {
                throw new RuntimeException("Clé publique manquante pour vérifier la signature");
            }

            String derivedAddress = CryptoUtils.addressFromPublicKey(
                    CryptoUtils.publicKeyFromBase64(senderPublicKeyBase64)
            );

            if (!derivedAddress.equals(transaction.getSender())) {
                throw new RuntimeException("La clé publique ne correspond pas à l'adresse sender");
            }

            boolean validSignature = CryptoUtils.verify(
                    transaction.getPayload(),
                    transaction.getSignature(),
                    CryptoUtils.publicKeyFromBase64(senderPublicKeyBase64)
            );

            if (!validSignature) {
                throw new RuntimeException("Signature invalide");
            }

            BigDecimal senderBalance = getBalance(transaction.getSender());
            BigDecimal senderPendingOutgoing = getPendingOutgoingAmount(transaction.getSender());
            BigDecimal availableBalance = senderBalance.subtract(senderPendingOutgoing);

            if (availableBalance.compareTo(transaction.getAmount()) < 0) {
                throw new RuntimeException("Solde insuffisant");
            }
        }

        transactionPoolService.add(TransactionPoolService.fromTransaction(transaction));
        return transaction;
    }

    public synchronized Block minePendingTransactions(String minerAddress) {
        if (minerAddress == null || minerAddress.isBlank()) {
            throw new RuntimeException("Adresse du mineur obligatoire");
        }

        List<Transaction> blockTransactions = new ArrayList<>();

        for (PendingTransaction pending : transactionPoolService.drainAll()) {
            Transaction tx = TransactionPoolService.toTransaction(pending);
            tx.setStatus("CONFIRMED");
            blockTransactions.add(tx);
        }

        Transaction rewardTx = new Transaction();
        rewardTx.setId(UUID.randomUUID().toString());
        rewardTx.setSender("SYSTEM");
        rewardTx.setRecipient(minerAddress);
        rewardTx.setAmount(MINING_REWARD);
        rewardTx.setTimestamp(System.currentTimeMillis());
        rewardTx.setSignature("SYSTEM");
        rewardTx.setSystemReward(true);
        rewardTx.setStatus("CONFIRMED");
        rewardTx.setPayload("MINING_REWARD");
        rewardTx.setHash(HashUtils.sha256(
                rewardTx.getId()
                        + "|" + rewardTx.getSender()
                        + "|" + rewardTx.getRecipient()
                        + "|" + rewardTx.getAmount().toPlainString()
                        + "|" + rewardTx.getTimestamp()
        ));

        blockTransactions.add(rewardTx);

        Block previousBlock = getLatestBlock();

        Block newBlock = new Block();
        newBlock.setIndex(previousBlock.getIndex() + 1);
        newBlock.setTimestamp(System.currentTimeMillis());
        newBlock.setData("Mined block with " + blockTransactions.size() + " transaction(s)");
        newBlock.setTransactions(blockTransactions);
        newBlock.setPreviousHash(previousBlock.getHash());
        newBlock.setNonce(0);
        newBlock.setDifficulty(DIFFICULTY);

        mine(newBlock);

        BlockValidationResult validation = validationService.validateBlockAgainstChain(newBlock, blockchain);
        if (!validation.isValid()) {
            throw new InvalidBlockException(validation.getMessage());
        }

        blockchain.add(newBlock);
        marketChartService.recordBlockMined();
        persistBlocks();
        metricsCollector.recordBlockMined("pending index=" + newBlock.getIndex());

        return newBlock;
    }

    public synchronized Transaction mintSystemCredit(String recipientAddress, BigDecimal amount, String payload) {
        if (recipientAddress == null || recipientAddress.isBlank()) {
            throw new RuntimeException("Adresse destinataire obligatoire");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Le montant doit être supérieur à 0");
        }

        Transaction creditTx = new Transaction();
        creditTx.setId(UUID.randomUUID().toString());
        creditTx.setSender("SYSTEM");
        creditTx.setRecipient(recipientAddress);
        creditTx.setAmount(amount);
        creditTx.setTimestamp(System.currentTimeMillis());
        creditTx.setSignature("SYSTEM");
        creditTx.setSystemReward(true);
        creditTx.setStatus("CONFIRMED");
        creditTx.setPayload(payload != null ? payload : "SYSTEM_CREDIT");
        creditTx.setHash(HashUtils.sha256(
                creditTx.getId()
                        + "|" + creditTx.getSender()
                        + "|" + creditTx.getRecipient()
                        + "|" + creditTx.getAmount().toPlainString()
                        + "|" + creditTx.getTimestamp()
                        + "|" + creditTx.getPayload()
        ));

        List<Transaction> blockTransactions = new ArrayList<>();
        blockTransactions.add(creditTx);

        Block previousBlock = getLatestBlock();

        Block newBlock = new Block();
        newBlock.setIndex(previousBlock.getIndex() + 1);
        newBlock.setTimestamp(System.currentTimeMillis());
        newBlock.setData("System credit to " + recipientAddress);
        newBlock.setTransactions(blockTransactions);
        newBlock.setPreviousHash(previousBlock.getHash());
        newBlock.setNonce(0);
        newBlock.setDifficulty(DIFFICULTY);

        mine(newBlock);

        BlockValidationResult validation = validationService.validateBlockAgainstChain(newBlock, blockchain);
        if (!validation.isValid()) {
            throw new InvalidBlockException(validation.getMessage());
        }

        blockchain.add(newBlock);
        marketChartService.recordBlockMined();
        persistBlocks();
        metricsCollector.recordBlockMined("mint index=" + newBlock.getIndex());

        return creditTx;
    }

    /**
     * Crédit SYSTEM placé dans le mempool (PENDING) — aucun bloc tant qu'on ne mine pas.
     */
    public synchronized Transaction enqueueSystemCredit(
            String recipientAddress,
            BigDecimal amount,
            String payload
    ) {
        if (recipientAddress == null || recipientAddress.isBlank()) {
            throw new RuntimeException("Adresse destinataire obligatoire");
        }

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Le montant doit être supérieur à 0");
        }

        Transaction creditTx = new Transaction();
        creditTx.setId(UUID.randomUUID().toString());
        creditTx.setSender("SYSTEM");
        creditTx.setRecipient(recipientAddress);
        creditTx.setAmount(amount);
        creditTx.setTimestamp(System.currentTimeMillis());
        creditTx.setSignature("SYSTEM");
        creditTx.setSystemReward(true);
        creditTx.setStatus("PENDING");
        creditTx.setPayload(payload != null ? payload : "SYSTEM_CREDIT");
        creditTx.setHash(HashUtils.sha256(
                creditTx.getId()
                        + "|" + creditTx.getSender()
                        + "|" + creditTx.getRecipient()
                        + "|" + creditTx.getAmount().toPlainString()
                        + "|" + creditTx.getTimestamp()
                        + "|" + creditTx.getPayload()
        ));

        return addTransaction(creditTx, null);
    }

    public synchronized boolean addBlockFromPeer(Block block) {
        if (block == null) {
            return false;
        }

        Block latestBlock = getLatestBlock();

        boolean isNextBlock =
                block.getIndex() == latestBlock.getIndex() + 1 &&
                        safeEquals(latestBlock.getHash(), block.getPreviousHash());

        if (!isNextBlock) {
            return false;
        }

        if (!isValidNewBlock(block, latestBlock)) {
            return false;
        }

        BlockValidationResult validation = validationService.validateBlockAgainstChain(block, blockchain);
        if (!validation.isValid()) {
            return false;
        }

        blockchain.add(block);
        marketChartService.recordBlockMined();
        persistBlocks();
        return true;
    }

    public synchronized boolean replaceChainFromPeer(List<Block> newBlocks) {
        if (newBlocks == null || newBlocks.isEmpty()) {
            return false;
        }

        if (!isValidChain(newBlocks)) {
            return false;
        }

        BlockValidationResult validation = validationService.validateChain(newBlocks);
        if (!validation.isValid()) {
            return false;
        }

        if (newBlocks.size() <= blockchain.size()) {
            return false;
        }

        blockchain.clear();
        blockchain.addAll(newBlocks);
        transactionPoolService.clear();
        persistBlocks();
        return true;
    }

    public synchronized boolean isValidChain(List<Block> chainToValidate) {
        if (chainToValidate == null || chainToValidate.isEmpty()) {
            return false;
        }

        if (!isSameBlock(chainToValidate.get(0), createGenesisBlock())) {
            return false;
        }

        for (int i = 1; i < chainToValidate.size(); i++) {
            Block currentBlock = chainToValidate.get(i);
            Block previousBlock = chainToValidate.get(i - 1);

            if (!isValidNewBlock(currentBlock, previousBlock)) {
                return false;
            }
        }

        return true;
    }

    public synchronized boolean isChainValid() {
        BlockValidationResult validation = validationService.validateChain(blockchain);
        if (!validation.isValid()) {
            return false;
        }

        for (int i = 1; i < blockchain.size(); i++) {
            Block current = blockchain.get(i);
            Block previous = blockchain.get(i - 1);

            if (!isValidNewBlock(current, previous)) {
                return false;
            }
        }

        return true;
    }

    public synchronized BigDecimal getBalance(String address) {
        BigDecimal balance = BigDecimal.ZERO;

        for (Block block : blockchain) {
            if (block.getTransactions() == null) {
                continue;
            }

            for (Transaction tx : block.getTransactions()) {
                if (tx == null || tx.getAmount() == null) {
                    continue;
                }

                if (address.equals(tx.getRecipient())) {
                    balance = balance.add(tx.getAmount());
                }

                if (address.equals(tx.getSender())) {
                    balance = balance.subtract(tx.getAmount());
                }
            }
        }

        return balance;
    }

    public synchronized BigDecimal calculateWalletBalance(String address, List<Transaction> transactions) {
        BigDecimal balance = BigDecimal.ZERO;

        for (Transaction tx : transactions) {
            if (tx == null || tx.getAmount() == null) {
                continue;
            }

            if (address != null && address.equals(tx.getRecipient())) {
                balance = balance.add(tx.getAmount());
            }

            if (address != null && address.equals(tx.getSender())) {
                balance = balance.subtract(tx.getAmount());
            }
        }

        return balance;
    }

    public synchronized boolean hasSufficientBalance(String address, BigDecimal amount, List<Transaction> transactions) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        BigDecimal balance = calculateWalletBalance(address, transactions);
        return balance.compareTo(amount) >= 0;
    }

    public synchronized StatsResponse getStats() {
        Block latestBlock = getLatestBlock();

        long chainSize = 0;
        for (Block block : blockchain) {
            if (block.getData() != null) {
                chainSize += block.getData().length();
            }
            if (block.getTransactions() != null) {
                chainSize += block.getTransactions().size();
            }
        }

        return new StatsResponse(
                blockchain.size(),
                latestBlock.getHash(),
                chainSize
        );
    }

    private boolean isValidNewBlock(Block newBlock, Block previousBlock) {
        if (newBlock == null || previousBlock == null) {
            return false;
        }

        if (previousBlock.getIndex() + 1 != newBlock.getIndex()) {
            return false;
        }

        if (!safeEquals(previousBlock.getHash(), newBlock.getPreviousHash())) {
            return false;
        }

        String recalculatedHash = calculateHash(newBlock);
        if (!safeEquals(recalculatedHash, newBlock.getHash())) {
            return false;
        }

        return newBlock.getHash() != null
                && newBlock.getHash().startsWith(getDifficultyPrefix());
    }

    private BigDecimal getPendingOutgoingAmount(String address) {
        return transactionPoolService.getPendingOutgoingAmount(address);
    }

    private boolean isSameBlock(Block a, Block b) {
        if (a == null || b == null) {
            return false;
        }

        return a.getIndex() == b.getIndex()
                && a.getTimestamp() == b.getTimestamp()
                && a.getNonce() == b.getNonce()
                && a.getDifficulty() == b.getDifficulty()
                && safeEquals(a.getData(), b.getData())
                && safeEquals(a.getPreviousHash(), b.getPreviousHash())
                && safeEquals(a.getHash(), b.getHash());
    }

    private boolean safeEquals(String a, String b) {
        return a == null ? b == null : a.equals(b);
    }

    private void persistBlocks() {
        blockchainStateStore.saveBlocks(List.copyOf(blockchain));
    }
}