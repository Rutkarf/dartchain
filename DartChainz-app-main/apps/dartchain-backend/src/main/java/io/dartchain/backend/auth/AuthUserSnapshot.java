package io.dartchain.backend.auth;

import java.util.ArrayList;
import java.util.List;

public class AuthUserSnapshot {

    private List<UserAccount> users = new ArrayList<>();

    public List<UserAccount> getUsers() {
        return users;
    }

    public void setUsers(List<UserAccount> users) {
        this.users = users != null ? users : new ArrayList<>();
    }
}
