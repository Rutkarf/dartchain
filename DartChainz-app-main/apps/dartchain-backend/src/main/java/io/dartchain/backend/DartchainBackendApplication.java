package io.dartchain.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DartchainBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(DartchainBackendApplication.class, args);
	}

}
