const propertyTour = document.querySelector('.property-tour');
const tourVideo = document.querySelector('.property-hero-video');
const tourTitle = document.querySelector('.property-camera-title');
const tourDescription = document.querySelector('.property-camera-description');
const statusNumber = document.querySelector('.property-status-number');
const statusWord = document.querySelector('.property-status-word');
const tourProgress = document.querySelector('.property-tour-progress span');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let activeStep = -1;
let scrollFrame = 0;
let videoFrame = 0;
let videoSeeking = false;
let desiredVideoTime = 0;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function scheduleVideoSeek() {
  if (videoFrame || videoSeeking || reduceMotion.matches || !Number.isFinite(tourVideo.duration)) return;
  videoFrame = window.requestAnimationFrame(() => {
    videoFrame = 0;
    const distance = desiredVideoTime - tourVideo.currentTime;
    if (Math.abs(distance) < .02 || videoSeeking) return;
    videoSeeking = true;
    tourVideo.currentTime = desiredVideoTime;
  });
}

function setTourFrame() {
  const rect = propertyTour.getBoundingClientRect();
  const travel = Math.max(propertyTour.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);

  if (!reduceMotion.matches && Number.isFinite(tourVideo.duration)) {
    desiredVideoTime = progress * Math.max(tourVideo.duration - .08, 0);
    scheduleVideoSeek();
  }
  tourProgress.style.transform = `scaleX(${progress})`;

  const step = progress < .34 ? 0 : progress < .7 ? 1 : 2;
  if (step === activeStep) return;

  activeStep = step;
  const copy = [
    ['Domina<br /><em>Milano.</em>', 'Un attico che non guarda la città: la contiene.', '01', 'Avvicinati'],
    ['Attraversa<br /><em>la soglia.</em>', 'Il living si apre, piano dopo piano.', '02', 'Entra'],
    ['Il cielo,<br /><em>tutto tuo.</em>', 'La città resta sotto. La serata comincia qui.', '03', 'Abita'],
  ][step];

  tourTitle.innerHTML = copy[0];
  tourDescription.textContent = copy[1];
  statusNumber.textContent = copy[2];
  statusWord.textContent = copy[3];
}

function requestTourFrame() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    setTourFrame();
  });
}

window.addEventListener('scroll', requestTourFrame, { passive: true });
window.addEventListener('resize', requestTourFrame, { passive: true });
tourVideo.addEventListener('loadedmetadata', setTourFrame);
tourVideo.addEventListener('seeked', () => {
  videoSeeking = false;
  scheduleVideoSeek();
});
setTourFrame();

// Start inside the living area; the separate details link opens the property facts.
document.querySelector('[data-enter-attico]').addEventListener('click', () => {
  tourVideo.play().then(() => { tourVideo.pause(); setTourFrame(); }).catch(() => {});
  const travel = Math.max(propertyTour.offsetHeight - window.innerHeight, 1);
  window.scrollTo({ top: propertyTour.offsetTop + travel * .48, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
});

// Static previews may not support byte ranges, which are needed for video seeking.
fetch(tourVideo.querySelector('source').src)
  .then((response) => response.ok ? response.blob() : Promise.reject(response.status))
  .then((blob) => { tourVideo.src = URL.createObjectURL(blob); tourVideo.load(); })
  .catch(() => {});
