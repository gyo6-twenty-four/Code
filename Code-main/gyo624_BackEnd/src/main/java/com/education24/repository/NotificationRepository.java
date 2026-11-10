package com.education24.repository;
import com.education24.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NotificationRepository extends JpaRepository<Notification,Long>{}
