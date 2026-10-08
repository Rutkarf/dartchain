package io.dartchain.backend.persistence.repository;

import io.dartchain.backend.persistence.entity.IpBanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IpBanJpaRepository extends JpaRepository<IpBanEntity, String> {
    boolean existsByIpAddress(String ipAddress);
}
