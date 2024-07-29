// Initialize SimpleMDE
var simplemde = new SimpleMDE({
    element: document.getElementById("result"),
    initialValue: ""
});

let allGroups = [];
let introText = '';
let outroText = '';

// Load YAML file
fetch('questions.yaml')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.text();
    })
    .then(yamlText => {
        const data = jsyaml.load(yamlText);
        displayIntroduction(data);
        allGroups = data.groups;
        introText = data.intro_text || '';
        outroText = data.outro_text || '';
        createQuestionnaire(data.groups);
    })
    .catch(error => console.error('Error fetching the YAML file:', error));

// Display title and introduction
function displayIntroduction(data) {
    document.getElementById('main-title').innerText = data.title;
    document.getElementById('introduction').innerHTML = marked.parse(data.introduction);
}

// Create questionnaire form
function createQuestionnaire(groups, parentDiv = document.getElementById('questionnaire'), level = 1) {
    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('mb-4', `pl-${level * 2}`);
        groupDiv.innerHTML = `<h${level + 3}>${group.group_name}</h${level + 3}>`;

        if (group.questions) {
            group.questions.forEach(question => {
                appendQuestion(groupDiv, question);
            });
        }

        if (group.groups) {
            createQuestionnaire(group.groups, groupDiv, level + 1);
        }

        parentDiv.appendChild(groupDiv);
    });

    if (level === 1) {
        generateFullText(); // Initial text generation
    }
}

// Helper function to append questions
function appendQuestion(parentDiv, question) {
    const div = document.createElement('div');
    div.classList.add('form-group', 'label-group');
    div.setAttribute('data-question-id', question.id);
    div.setAttribute('data-conditions', JSON.stringify(question.conditions || []));
    div.style.display = question.conditions && question.conditions.length > 0 ? 'none' : 'block'; // Show initially if no conditions

    div.innerHTML = `<label>${marked.parse(question.question)}</label>`;

    if (question.type === 'multiple_choice') {
        let defaultSelected = false;

        question.options.forEach(option => {
            const checked = option.default ? 'checked' : '';
            if (option.default) {
                defaultSelected = true;
            }
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${option.id}" value="${option.id}" ${checked} ${option.default ? 'data-default="true"' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });

        if (question.none_option) {
            const checked = defaultSelected ? '' : 'checked';
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="${question.id}" id="${question.id}_none" value="" ${checked}>
                    <label class="form-check-label" for="${question.id}_none">${question.none_option}</label>
                </div>
            `;
        }
    } else if (question.type === 'checkbox') {
        question.options.forEach(option => {
            div.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${question.id}" id="${option.id}" value="${option.id}" ${option.default ? 'checked' : ''}>
                    <label class="form-check-label" for="${option.id}">${option.label}</label>
                </div>
            `;
        });
    } else if (question.type === 'text') {
        const multiline = question.multiline || false; // Default value is false
        let textInput;

        if (multiline) {
            textInput = document.createElement('textarea');
            textInput.name = question.id;
            textInput.rows = 4;
            textInput.cols = 50;
        } else {
            textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.name = question.id;
            textInput.classList.add('form-control');
        }

        if (question.placeholder) {
            textInput.placeholder = question.placeholder;
        }

        if (question.default_from) {
            const defaultFromInput = document.querySelector(`[name="${question.default_from}"]`);
            if (defaultFromInput) {
                const updateDefault = () => {
                    if (textInput.dataset.userChanged !== 'true') {
                        textInput.value = defaultFromInput.value || question.placeholder || '';
                    }
                };
                updateDefault();
                defaultFromInput.addEventListener('input', updateDefault);
                textInput.addEventListener('input', () => {
                    textInput.dataset.userChanged = 'true';
                });
            }
        }

        div.appendChild(textInput);
    }

    parentDiv.appendChild(div);

    // Add event listeners to update the text on change
    const inputs = div.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            checkConditions();
            generateFullText();
        });
    });

    // Check conditions initially
    setTimeout(checkConditions, 0); // Ensure conditions are checked after initial render
}

// Initial call to check conditions after loading the form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('questionnaire');
    const questions = form.querySelectorAll('[data-question-id]');

    questions.forEach(questionDiv => {
        const conditions = JSON.parse(questionDiv.getAttribute('data-conditions'));
        if (conditions.length === 0) {
            questionDiv.style.display = 'block';
        }
    });

    checkConditions();
    generateFullText(); // Generate initial text with default values
});


// Check conditions to show or hide questions
function checkConditions() {
    const form = document.getElementById('questionnaire');
    const questions = form.querySelectorAll('[data-question-id]');

    questions.forEach(questionDiv => {
        const conditions = JSON.parse(questionDiv.getAttribute('data-conditions'));
        let showQuestion = true;

        if (conditions.length > 0) {
            conditions.forEach(condition => {
                const conditionQuestion = form.querySelector(`[name="${condition.id}"]`);
                if (conditionQuestion) {
                    const checkedInputs = [...form.querySelectorAll(`[name="${condition.id}"]:checked`)];
                    const conditionMet = checkedInputs.map(input => input.value).includes(condition.value);

                    // Check for default selected option
                    if (checkedInputs.length === 0) {
                        const defaultOption = form.querySelector(`[name="${condition.id}"][value="${condition.value}"][data-default="true"]`);
                        if (defaultOption) {
                            defaultOption.checked = true;
                            showQuestion = true;
                        } else {
                            showQuestion = false;
                        }
                    } else if (!conditionMet) {
                        showQuestion = false;
                    }
                }
            });
        }

        questionDiv.style.display = showQuestion ? 'block' : 'none';
    });
}


// Generate full text including intro and outro
function generateFullText() {
    const { answers, placeholders } = collectAnswers(allGroups);

    let text = introText ? replacePlaceholders(introText, answers, placeholders) + '\n\n' : '';
    text += generateText(allGroups, answers, placeholders);
    if (outroText) {
        text += '\n\n' + replacePlaceholders(outroText, answers, placeholders);
    }

    simplemde.value(text); // Set the generated text in the SimpleMDE editor

    // Toggle preview mode to ensure rendering
    simplemde.togglePreview();

    // Check if the editor is in preview mode, if not toggle it to preview mode
    if (!simplemde.isPreviewActive()) {
        simplemde.togglePreview(); // First toggle to preview mode
    }
}

// Replace placeholders with answers or placeholders
function replacePlaceholders(text, answers, placeholders = {}) {
    const predefinedPlaceholders = {
        current_date: new Date().toLocaleDateString(),
        current_time: new Date().toLocaleTimeString(),
        current_datetime: new Date().toLocaleString(),
        // Add more predefined placeholders as needed
    };

    Object.keys(answers).forEach(key => {
        text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), answers[key]);
    });
    Object.keys(placeholders).forEach(key => {
        if (!answers[key]) {
            text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), placeholders[key]);
        }
    });
    Object.keys(predefinedPlaceholders).forEach(key => {
        text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), predefinedPlaceholders[key]);
    });
    return text;
}




// Collect all answers first
function collectAnswers(groups, level = 1) {
    const form = document.getElementById('questionnaire');
    const answers = {};
    const placeholders = {};

    groups.forEach(group => {
        if (group.questions) {
            group.questions.forEach(question => {
                if (question.type === 'multiple_choice' || question.type === 'checkbox') {
                    const values = [...form.querySelectorAll(`[name="${question.id}"]:checked`)].map(input => input.nextSibling.textContent.trim());
                    if (values.length > 0) {
                        answers[question.id] = values.join(', ');
                    }
                    // Store placeholder value if no answer is given
                    const options = question.options.filter(option => option.default);
                    if (options.length > 0) {
                        placeholders[question.id] = options.map(option => option.label).join(', ');
                    }
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"], input[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        answers[question.id] = textInput.value.trim();
                    }
                    // Store placeholder value if no answer is given
                    if (question.placeholder) {
                        placeholders[question.id] = question.placeholder;
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupAnswers = collectAnswers(group.groups, level + 1);
            Object.assign(answers, subGroupAnswers.answers);
            Object.assign(placeholders, subGroupAnswers.placeholders);
        }
    });

    return { answers, placeholders };
}


// Generate text based on answers
function generateText(groups, answers, placeholders, level = 1) {
    const form = document.getElementById('questionnaire');
    let text = '';

    groups.forEach(group => {
        let groupText = '';
        let hasContent = false;

        if (group.questions) {
            group.questions.forEach(question => {
                const values = form.querySelectorAll(`[name="${question.id}"]:checked`);
                if (question.type === 'multiple_choice' || question.type === 'checkbox') {
                    if (values.length > 0) {
                        values.forEach(value => {
                            const selectedOption = question.options.find(option => option.id === value.value);
                            if (selectedOption) {
                                if (question.pre_text) {
                                    groupText += question.pre_text;
                                }
                                let textBlock = selectedOption.text_block;
                                // Replace placeholders
                                textBlock = replacePlaceholders(textBlock, answers, placeholders);
                                groupText += textBlock;
                                if (question.post_text) {
                                    groupText += question.post_text;
                                }
                                groupText += '\n\n';
                                hasContent = true;
                            }
                        });
                    }
                } else if (question.type === 'text') {
                    const textInput = form.querySelector(`textarea[name="${question.id}"], input[name="${question.id}"]`);
                    if (textInput && textInput.value.trim() !== '') {
                        if (question.pre_text) {
                            groupText += question.pre_text;
                        }
                        let textBlock = question.text_block.replace('[USER_INPUT]', textInput.value.trim());
                        // Replace placeholders
                        textBlock = replacePlaceholders(textBlock, answers, placeholders);
                        groupText += textBlock;
                        if (question.post_text) {
                            groupText += question.post_text;
                        }
                        groupText += '\n\n';
                        hasContent = true;
                    }
                }
            });
        }

        if (group.groups) {
            const subGroupText = generateText(group.groups, answers, placeholders, level + 1);
            if (subGroupText.trim() !== '') {
                groupText += subGroupText;
                hasContent = true;
            }
        }

        if (hasContent) {
            if (group.show_group_name !== false) {
                text += `${'#'.repeat(level + 2)} ${group.group_name}\n\n`;
            }
            text += groupText;
        }
    });

    return text;
}