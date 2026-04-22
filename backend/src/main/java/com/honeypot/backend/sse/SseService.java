package com.honeypot.backend.sse;

import jakarta.annotation.PostConstruct;
import org.postgresql.PGConnection;
import org.postgresql.PGNotification;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final DataSource dataSource;

    public SseService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public SseEmitter createEmitter() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        emitters.add(emitter);
        return emitter;
    }

    public void pushUpdate(String eventName) {
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event().name(eventName).data("update"));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        });
        emitters.removeAll(deadEmitters);
    }

    @PostConstruct
    public void startListening() {
        Thread listenerThread = new Thread(() -> {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {

                stmt.execute("LISTEN attacks");
                stmt.execute("LISTEN auth_logs");
                stmt.execute("LISTEN command_logs");

                PGConnection pgConn = conn.unwrap(PGConnection.class);

                while (!Thread.currentThread().isInterrupted()) {
                    PGNotification[] notifications = pgConn.getNotifications(1000);
                    if (notifications != null) {
                        for (PGNotification notification : notifications) {
                            pushUpdate(notification.getName());
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        listenerThread.setDaemon(true);
        listenerThread.start();
    }
}