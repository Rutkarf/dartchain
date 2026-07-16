package io.dartchain.backend.model;

import java.util.ArrayList;
import java.util.List;

public class Block {

    private int index;
    private long timestamp;

    // Compatibilité avec ton ancien code
    private String data;

    // Nouvelle structure pour la blockchain avec transactions
    private List<Transaction> transactions = new ArrayList<>();

    private String previousHash;
    private String hash;
    private int nonce;
    private int difficulty;

    public Block() {
    }

    // Ancien constructeur conservé
    public Block(int index, long timestamp, String data, String previousHash, String hash, int nonce) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = hash;
        this.nonce = nonce;
        this.transactions = new ArrayList<>();
        this.difficulty = 0;
    }

    // Nouveau constructeur avec transactions + difficulté
    public Block(int index, long timestamp, List<Transaction> transactions, String previousHash, String hash, int nonce, int difficulty) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions != null ? transactions : new ArrayList<>();
        this.previousHash = previousHash;
        this.hash = hash;
        this.nonce = nonce;
        this.difficulty = difficulty;
        this.data = null;
    }

    // Constructeur complet compatible ancien + nouveau modèle
    public Block(int index, long timestamp, String data, List<Transaction> transactions, String previousHash, String hash, int nonce, int difficulty) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.transactions = transactions != null ? transactions : new ArrayList<>();
        this.previousHash = previousHash;
        this.hash = hash;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public List<Transaction> getTransactions() {
        if (transactions == null) {
            transactions = new ArrayList<>();
        }
        return transactions;
    }

    public void setTransactions(List<Transaction> transactions) {
        this.transactions = transactions != null ? transactions : new ArrayList<>();
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public void setPreviousHash(String previousHash) {
        this.previousHash = previousHash;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public int getNonce() {
        return nonce;
    }

    public void setNonce(int nonce) {
        this.nonce = nonce;
    }

    public int getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(int difficulty) {
        this.difficulty = difficulty;
    }
}