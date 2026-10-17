function updateProgress(card, currentStep, totalSteps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  card.querySelector('.progress-stat').textContent = `Progress: ${currentStep}/${totalSteps}`;
  card.querySelector('.progress-percent').textContent = `${percentage}%`;
  card.querySelector('.progress-fill').style.width = `${percentage}%`;
}

const habitList = document.querySelector('.habit-list');
const habitInput = document.querySelector('.add-habit-box');
const addHabitButton = document.querySelector('.add-habit-btn');
const addHabitForm = habitInput.closest('form');
const habitTemplate = document.getElementById('habitCardTemplate');
const storageKey = 'habit-tracker-habits';

function getHabitData(card) {
  return {
    name: card.querySelector('.name').textContent.trim(),
    completedDays: Array.from(card.querySelectorAll('.days .comp i'), (icon) =>
      icon.classList.contains('fa-circle-check')
    ),
    completedToday: card.querySelector('.comp-btn') !== null
  };
}

function saveHabits() {
  const habits = Array.from(habitList.querySelectorAll(':scope > .card'), getHabitData);

  try {
    localStorage.setItem(storageKey, JSON.stringify(habits));
  } catch (error) {
    console.error('Could not save habits to local storage.', error);
  }
}

function loadHabits() {
  let savedHabits;

  try {
    const savedData = localStorage.getItem(storageKey);
    if (savedData === null) {
      return null;
    }
    savedHabits = JSON.parse(savedData);
  } catch (error) {
    console.error('Could not read saved habits from local storage.', error);
    return null;
  }

  const isValid = Array.isArray(savedHabits) && savedHabits.every((habit) =>
    habit &&
    typeof habit.name === 'string' &&
    Array.isArray(habit.completedDays) &&
    habit.completedDays.length === 7 &&
    habit.completedDays.every((day) => typeof day === 'boolean') &&
    typeof habit.completedToday === 'boolean'
  );

  if (!isValid) {
    console.error('Saved habits have an invalid format. Showing the default habits instead.');
    return null;
  }

  return savedHabits;
}

function createHabitCard(name) {
  const card = habitTemplate.content.firstElementChild?.cloneNode(true);
  if (!(card instanceof HTMLElement)) {
    throw new Error('The habit card template is missing or invalid.');
  }

  card.querySelector('.name').textContent = name;
  return card;
}

function showHabitData(card, habit) {
  card.querySelector('.name').textContent = habit.name;

  const dayIcons = card.querySelectorAll('.days .comp i');
  dayIcons.forEach((icon, index) => {
    if (habit.completedDays[index]) {
      icon.classList.replace('fa-circle', 'fa-circle-check');
      icon.classList.replace('fa-regular', 'fa-solid');
    } else {
      icon.classList.replace('fa-circle-check', 'fa-circle');
      icon.classList.replace('fa-solid', 'fa-regular');
    }
  });

  const completed = habit.completedDays.filter(Boolean).length;
  updateProgress(card, completed, 7);

  const button = card.querySelector('.comp-btn, .comp-btn-blank');
  if (habit.completedToday) {
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fa-solid fa-check';
    checkIcon.setAttribute('aria-hidden', 'true');
    button.replaceChildren(checkIcon, document.createTextNode(' Completed'));
    button.classList.replace('comp-btn-blank', 'comp-btn');
  } else {
    button.replaceChildren(document.createTextNode('Mark Complete'));
    button.classList.replace('comp-btn', 'comp-btn-blank');
  }
}

function restoreHabits() {
  const savedHabits = loadHabits();
  if (!savedHabits) {
    return;
  }

  const defaultCards = Array.from(habitList.querySelectorAll(':scope > .card'));
  const usedCards = new Set();
  const restoredCards = savedHabits.map((habit) => {
    const matchingCard = defaultCards.find((card) =>
      !usedCards.has(card) && card.querySelector('.name').textContent.trim() === habit.name
    );
    const card = matchingCard || createHabitCard(habit.name);
    usedCards.add(card);
    showHabitData(card, habit);
    return card;
  });

  defaultCards.forEach((card) => card.remove());
  habitList.append(...restoredCards);
}

function setProgress(completed, total) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const offset = circumference - (percentage / 100) * circumference;

  document.getElementById('progressCircle').style.strokeDashoffset = offset;
  document.getElementById('percentText').textContent = `${percentage}%`;
  document.getElementById('statusText').textContent = `${completed} of ${total} habits`;
}

function updateDashboardStats() {
  const cards = habitList.querySelectorAll(':scope > .card');
  const completed = habitList.querySelectorAll(':scope > .card .comp-btn').length;

  document.querySelector('.stats tr:first-child .stats-value').textContent = cards.length;
  setProgress(completed, cards.length);
}

restoreHabits();
habitList.querySelectorAll(':scope > .card').forEach((card) => {
  const habit = getHabitData(card);
  updateProgress(card, habit.completedDays.filter(Boolean).length, 7);
});
updateDashboardStats();

addHabitForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = habitInput.value.trim();
  habitInput.setCustomValidity(name ? '' : 'Enter a habit name.');
  if (!habitInput.reportValidity()) {
    return;
  }

  const card = createHabitCard(name);
  updateProgress(card, 0, 7);
  habitList.append(card);
  habitInput.value = '';
  habitInput.setCustomValidity('');
  updateDashboardStats();
  saveHabits();
  habitInput.focus();
});

habitInput.addEventListener('input', () => habitInput.setCustomValidity(''));
addHabitButton.addEventListener('click', () => addHabitForm.requestSubmit());

habitList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest('.del-btn, .comp-btn-blank');
  if (!button) {
    return;
  }

  const card = button.closest('.card');
  if (!card) {
    return;
  }

  if (button.classList.contains('del-btn')) {
    card.remove();
    updateDashboardStats();
    saveHabits();
    return;
  }

  const dayIcon = Array.from(card.querySelectorAll('.days .comp i'))
    .find((icon) => !icon.classList.contains('fa-circle-check'));
  if (dayIcon) {
    dayIcon.classList.replace('fa-circle', 'fa-circle-check');
    dayIcon.classList.replace('fa-regular', 'fa-solid');
  }

  const completed = card.querySelectorAll('.days .comp i.fa-circle-check').length;
  updateProgress(card, completed, 7);
  const checkIcon = document.createElement('i');
  checkIcon.className = 'fa-solid fa-check';
  checkIcon.setAttribute('aria-hidden', 'true');
  button.replaceChildren(checkIcon, document.createTextNode(' Completed'));
  button.classList.replace('comp-btn-blank', 'comp-btn');
  updateDashboardStats();
  saveHabits();
});
