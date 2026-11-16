package app.rediohubea.mobile;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeRadio")
public class NativeRadioPlugin extends Plugin {
  private void command(String action, PluginCall call, boolean foreground) {
    Intent intent = new Intent(getContext(), RadioPlaybackService.class);
    intent.setAction(action);
    try {
      if (foreground && Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent);
      else getContext().startService(intent);
      call.resolve();
    } catch (Exception error) {
      call.reject("Android media service command failed", error);
    }
  }

  @PluginMethod
  public void play(PluginCall call) {
    String url = call.getString("url");
    String title = call.getString("title", "REDIO HUB EA");
    if (url == null || !url.startsWith("https://") || url.length() > 2048) {
      call.reject("Only approved HTTPS media streams are supported");
      return;
    }
    Intent intent = new Intent(getContext(), RadioPlaybackService.class);
    intent.setAction(RadioPlaybackService.ACTION_PLAY);
    intent.putExtra("url", url);
    if (call.getArray("urls") != null) intent.putExtra("urlsJson", call.getArray("urls").toString());
    intent.putExtra("title", title);
    try {
      if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent);
      else getContext().startService(intent);
      call.resolve();
    } catch (Exception error) {
      call.reject("Unable to start background playback", error);
    }
  }

  @PluginMethod public void pause(PluginCall call) {
    command(RadioPlaybackService.ACTION_PAUSE, call, false);
  }

  @PluginMethod public void stop(PluginCall call) {
    command(RadioPlaybackService.ACTION_STOP, call, false);
  }

  @PluginMethod public void setVolume(PluginCall call) {
    double volume = call.getDouble("volume", 0.8);
    Intent intent = new Intent(getContext(), RadioPlaybackService.class);
    intent.setAction(RadioPlaybackService.ACTION_VOLUME);
    intent.putExtra("volume", (float) Math.max(0, Math.min(1, volume)));
    try { getContext().startService(intent); call.resolve(); }
    catch (Exception error) { call.reject("Unable to set volume", error); }
  }

  @PluginMethod public void setSleepTimer(PluginCall call) {
    int minutes = call.getInt("minutes", 0);
    if (minutes < 0 || minutes > 1440) {
      call.reject("Sleep timer must be 0–1440 minutes");
      return;
    }
    Intent intent = new Intent(getContext(), RadioPlaybackService.class);
    intent.setAction(RadioPlaybackService.ACTION_SLEEP);
    intent.putExtra("durationMs", minutes * 60_000L);
    try { getContext().startService(intent); call.resolve(); }
    catch (Exception error) { call.reject("Unable to set sleep timer", error); }
  }
}
