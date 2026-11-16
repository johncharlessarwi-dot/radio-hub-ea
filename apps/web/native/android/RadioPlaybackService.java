package app.rediohubea.mobile;

import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.PlaybackException;
import org.json.JSONArray;
import java.util.ArrayList;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class RadioPlaybackService extends MediaSessionService {
  public static final String ACTION_PLAY = "app.rediohubea.PLAY";
  public static final String ACTION_PAUSE = "app.rediohubea.PAUSE";
  public static final String ACTION_STOP = "app.rediohubea.STOP";
  public static final String ACTION_VOLUME = "app.rediohubea.VOLUME";
  public static final String ACTION_SLEEP = "app.rediohubea.SLEEP";
  private MediaSession session;
  private ExoPlayer player;
  private final Handler timerHandler = new Handler(Looper.getMainLooper());
  private Runnable sleepTask;
  private final ArrayList<String> fallbackUrls = new ArrayList<>();
  private int fallbackIndex = 0;
  private int retryCount = 0;

  @Override public void onCreate() {
    super.onCreate();
    player = new ExoPlayer.Builder(this).build();
    player.setAudioAttributes(new AudioAttributes.Builder()
      .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
      .setUsage(C.USAGE_MEDIA).build(), true);
    player.setHandleAudioBecomingNoisy(true);
    player.addListener(new Player.Listener() {
      @Override public void onPlayerError(PlaybackException error) { recoverStream(); }
    });
    session = new MediaSession.Builder(this, player).build();
  }

  private void recoverStream() {
    if (fallbackIndex + 1 < fallbackUrls.size()) {
      fallbackIndex++;
      player.setMediaItem(MediaItem.fromUri(fallbackUrls.get(fallbackIndex)));
      player.prepare();
      player.play();
      return;
    }
    if (retryCount < 3 && !fallbackUrls.isEmpty()) {
      long delay = 1500L * (1L << retryCount++);
      timerHandler.postDelayed(() -> {
        if (!fallbackUrls.isEmpty()) {
          fallbackIndex = 0;
          player.setMediaItem(MediaItem.fromUri(fallbackUrls.get(0)));
          player.prepare();
          player.play();
        }
      }, delay);
      return;
    }
    player.stop();
  }

  private void clearSleep() {
    if (sleepTask != null) timerHandler.removeCallbacks(sleepTask);
    sleepTask = null;
  }

  @Override public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null || intent.getAction() == null) return START_NOT_STICKY;
    switch (intent.getAction()) {
      case ACTION_PLAY: {
        String url = intent.getStringExtra("url");
        if (url == null || !url.startsWith("https://")) return START_NOT_STICKY;
        fallbackUrls.clear();
        fallbackUrls.add(url);
        String extras = intent.getStringExtra("urlsJson");
        if (extras != null) {
          try {
            JSONArray sources = new JSONArray(extras);
            for (int i = 0; i < Math.min(sources.length(), 8); i++) {
              String candidate = sources.optString(i,"");
              if (candidate.startsWith("https://") && !fallbackUrls.contains(candidate)) fallbackUrls.add(candidate);
            }
          } catch (Exception ignored) { /* Primary verified URL remains */ }
        }
        fallbackIndex=0;retryCount=0;
        String title = intent.getStringExtra("title");
        if (title == null || title.isEmpty()) title = "REDIO HUB EA";
        String current = player.getCurrentMediaItem() == null ? "" :
          player.getCurrentMediaItem().localConfiguration == null ? "" :
          player.getCurrentMediaItem().localConfiguration.uri.toString();
        if (!url.equals(current)) {
          MediaItem item = new MediaItem.Builder()
            .setUri(url)
            .setMediaMetadata(new MediaMetadata.Builder()
              .setTitle(title).setArtist("REDIO HUB EA").setIsPlayable(true).build())
            .build();
          player.setMediaItem(item);
          player.prepare();
        }
        player.play();
        break;
      }
      case ACTION_PAUSE:
        player.pause();
        break;
      case ACTION_VOLUME:
        player.setVolume(Math.max(0f, Math.min(1f, intent.getFloatExtra("volume", 0.8f))));
        break;
      case ACTION_SLEEP: {
        clearSleep();
        long ms = intent.getLongExtra("durationMs", 0L);
        if (ms > 0 && ms <= 24L * 60 * 60 * 1000) {
          sleepTask = () -> { player.pause(); sleepTask = null; };
          timerHandler.postDelayed(sleepTask, ms);
        }
        break;
      }
      case ACTION_STOP:
        clearSleep();
        player.stop();
        player.clearMediaItems();
        fallbackUrls.clear();
        retryCount=0;
        stopSelf();
        break;
      default: break;
    }
    return START_NOT_STICKY;
  }

  @Override public MediaSession onGetSession(MediaSession.ControllerInfo info) {
    return session;
  }

  @Override public void onDestroy() {
    clearSleep();
    if (session != null) { session.release(); session = null; }
    if (player != null) { player.release(); player = null; }
    super.onDestroy();
  }
}
