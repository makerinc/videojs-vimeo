import VimeoPlayer from "@vimeo/player";

export const css = `
  .vjs-vimeo iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;

export default function initializeVimeo(videojs) {
  const Component = videojs.getComponent("Component");
  const Tech = videojs.getComponent("Tech");
  let cssInjected = false;

  // Since the iframe can't be touched using Vimeo's way of embedding,
  // let's add a new styling rule to have the same style as `vjs-tech`
  function injectCss() {
    if (cssInjected) {
      return;
    }
    cssInjected = true;
    const head = document.head || document.getElementsByTagName("head")[0];

    const style = document.createElement("style");

    style.type = "text/css";

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
  }

  /**
   * Vimeo - Wrapper for Video Player API
   *
   * @param {Object=} options Object of option names and values
   * @param {Function=} ready Ready callback function
   * @extends Tech
   * @class Vimeo
   */
  class Vimeo extends Tech {
    constructor(options, ready) {
      super(options, ready);

      // injectCss();
      this.setPoster(options.poster);
      this.initVimeoPlayer();
    }

    initVimeoPlayer() {
      const vimeoOptions = {
        url: this.options_.source.src,
        byline: false,
        portrait: false,
        title: false,
        controls: false,
        autopause: 0,
      };

      if (this.options_.autoplay) {
        vimeoOptions.autoplay = true;
      }
      if (this.options_.height) {
        vimeoOptions.height = this.options_.height;
      }
      if (this.options_.width) {
        vimeoOptions.width = this.options_.width;
      }
      if (this.options_.maxheight) {
        vimeoOptions.maxheight = this.options_.maxheight;
      }
      if (this.options_.maxwidth) {
        vimeoOptions.maxwidth = this.options_.maxwidth;
      }
      if (this.options_.loop) {
        vimeoOptions.loop = this.options_.loop;
      }
      if (this.options_.muted) {
        vimeoOptions.muted = this.options_.muted;
      }
      if (this.options_.color) {
        // vimeo is the only API on earth to reject hex color with leading #
        vimeoOptions.color = this.options_.color.replace(/^#/, "");
      }

      this._player = new VimeoPlayer(this.el(), vimeoOptions);
      this.initVimeoState();

      ["play", "pause", "ended", "timeupdate", "progress", "seeked"].forEach(
        (e) => {
          this._player.on(e, (progress) => {
            if (this._vimeoState.progress.duration !== progress.duration) {
              this.trigger("durationchange");
            }
            this._vimeoState.progress = progress;
            this.trigger(e);
          });
        }
      );

      this._player.on("pause", () => (this._vimeoState.playing = false));
      this._player.on("play", () => {
        this._vimeoState.playing = true;
        this._vimeoState.ended = false;
      });
      this._player.on("ended", () => {
        this._vimeoState.playing = false;
        this._vimeoState.ended = true;
      });
      this._player.on(
        "volumechange",
        ({ volume }) => (this._vimeoState.volume = volume)
      );
      this._player.on("error", (e) => this.trigger("error", e));

      this.triggerReady();
    }

    initVimeoState() {
      const state = (this._vimeoState = {
        ended: false,
        playing: false,
        volume: 0,
        progress: {
          seconds: 0,
          percent: 0,
          duration: 0,
        },
      });

      this._player
        .getCurrentTime()
        .then((time) => (state.progress.seconds = time));
      this._player
        .getDuration()
        .then((time) => (state.progress.duration = time));
      this._player.getPaused().then((paused) => (state.playing = !paused));
      this._player.getVolume().then((volume) => {
        if (this.options_.muted) {
          volume = 0;
          this.setMuted(true);
        }

        state.volume = volume;
      });
    }

    createEl() {
      const div = videojs.createEl("div", {
        id: this.options_.techId,
      });

      div.style.cssText =
        "width:100%;height:100%;top:0;left:0;position:absolute";
      div.className = "vjs-vimeo";

      return div;
    }

    controls() {
      return false;
    }

    playbackRate() {
      return 1;
    }

    supportsFullScreen() {
      return true;
    }

    src() {
      // @note: Not sure why this is needed but videojs requires it
      return this.options_.source;
    }

    currentSrc() {
      return this.options_.source.src;
    }

    // @note setSrc is used in other usecases (YouTube, Html) it doesn't seem required here
    // setSrc() {}

    currentTime() {
      return this._vimeoState.progress.seconds;
    }

    setCurrentTime(time) {
      this._player.setCurrentTime(time);
    }

    volume() {
      return this._vimeoState.volume;
    }

    setVolume(volume) {
      return this._player.setVolume(volume);
    }

    duration() {
      return this._vimeoState.progress.duration;
    }

    buffered() {
      const progress = this._vimeoState.progress;

      return videojs.createTimeRange(0, progress.percent * progress.duration);
    }

    paused() {
      return !this._vimeoState.playing;
    }

    pause() {
      this._player.pause();
    }

    play() {
      this._player.play();
    }

    muted() {
      return this._vimeoState.volume === 0;
    }

    setMuted(mute) {
      this.setVolume(mute ? 0 : 1);

      this.setTimeout(() => {
        this.trigger("volumechange");
      }, 50);
    }

    ended() {
      return this._vimeoState.ended;
    }

    loop() {
      return this.options_.loop;
    }

    setLoop(val) {
      this.options_.loop = val;
    }
  }

  Vimeo.prototype.featuresTimeupdateEvents = true;

  Vimeo.isSupported = function () {
    return true;
  };

  // Add Source Handler pattern functions to this tech
  Tech.withSourceHandlers(Vimeo);

  Vimeo.nativeSourceHandler = {};

  /**
   * Check if Vimeo can play the given videotype
   * @param  {String} type    The mimetype to check
   * @return {String}         'maybe', or '' (empty string)
   */
  Vimeo.nativeSourceHandler.canPlayType = function (source) {
    if (source === "video/vimeo") {
      return "maybe";
    }

    return "";
  };

  /*
   * Check Vimeo can handle the source natively
   *
   * @param  {Object} source  The source object
   * @return {String}         'maybe', or '' (empty string)
   * @note: Copied over from YouTube — not sure this is relevant
   */
  Vimeo.nativeSourceHandler.canHandleSource = function (source) {
    if (source.type) {
      return Vimeo.nativeSourceHandler.canPlayType(source.type);
    } else if (source.src) {
      return Vimeo.nativeSourceHandler.canPlayType(source.src);
    }

    return "";
  };

  // @note: Copied over from YouTube — not sure this is relevant
  Vimeo.nativeSourceHandler.handleSource = function (source, tech) {
    tech.src(source.src);
  };

  // @note: Copied over from YouTube — not sure this is relevant
  Vimeo.nativeSourceHandler.dispose = function () {};

  Vimeo.registerSourceHandler(Vimeo.nativeSourceHandler);

  if (typeof videojs.registerTech !== "undefined") {
    videojs.registerTech("Vimeo", Vimeo);
  } else {
    videojs.registerComponent("Vimeo", Vimeo);
  }

  // Include the version number.
  Vimeo.VERSION = "0.0.1";

  return Vimeo;
}
