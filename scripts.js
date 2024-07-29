// Initialize SimpleMDE
var simplemde = new SimpleMDE({
    element: document.getElementById("result"),
    initialValue: ""
});

let allGroups = [];
let introText = '';
let outroText = '';

document.getElementById('load-url').addEventListener('click', () => {
    const url = document.getElementById('url-input').value;
    if (url) {
        handleURL(url);
    }
});

function handleURL(url) {
    if (isGitHubRepo(url)) {
        fetchRepoFiles(url);
    } else {
        document.getElementById('dropdown-container').style.display = 'none'; // Hide dropdown if not a repo
        fetchYAML(url);
    }
}

function isGitHubRepo(url) {
    // Check if the URL is a GitHub repository URL
    const githubRepoPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(\/|$)/;
    return githubRepoPattern.test(url);
}

// Fetch YAML files from GitHub repo
function fetchRepoFiles(repoUrl) {
    const apiUrl = repoUrl.replace('github.com', 'api.github.com/repos') + '/contents';
    fetch(apiUrl)
        .then(response => response.json())
        .then(files => {
            const yamlFiles = files.filter(file => file.name.endsWith('.yaml') || file.name.endsWith('.yml'));
            const select = document.getElementById('yaml-files');
            select.innerHTML = '';
            yamlFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = file.download_url;

                // Replace underscores with spaces and remove file extension
                const fileName = file.name.replace(/_/g, ' ').replace(/\.[^/.]+$/, '');
                option.textContent = fileName;

                select.appendChild(option);

                // Automatically load the first YAML file
                if (index === 0) {
                    fetchYAML(file.download_url);
                }
            });

            select.addEventListener('change', () => {
                const selectedUrl = select.value;
                if (selectedUrl) {
                    fetchYAML(selectedUrl);
                }
            });

            document.getElementById('dropdown-container').style.display = 'block'; // Show dropdown
        })
        .catch(error => console.error('Error fetching the repository files:', error));
}

// Fetch YAML file from URL
function fetchYAML(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.text();
        })
        .then(yamlText => {
            const data = jsyaml.load(yamlText);
            resetForm(); // Reset the form before loading new data
            displayIntroduction(data);
            allGroups = data.groups;
            introText = data.intro_text || '';
            outroText = data.outro_text || '';

            // Set titles for questionnaire and generated text with defaults if not provided
            const sectionTitles = data.section_titles || {};
            document.getElementById('questionnaire-title').innerHTML = marked.parse(sectionTitles.questionnaire || 'Questionnaire');
            document.getElementById('generated-text-title').innerHTML = marked.parse(sectionTitles.generated_text || 'Generated Text');

            createQuestionnaire(data.groups);
            checkConditions(); // Check conditions after creating the questionnaire
            generateFullText(); // Generate initial text with default values
        })
        .catch(error => console.error('Error fetching the YAML file:', error));
}

// Function to reset the form
function resetForm() {
    document.getElementById('main-title').innerText = '';
    document.getElementById('introduction').innerHTML = '';
    document.getElementById('questionnaire-title').innerText = 'Questionnaire';
    document.getElementById('generated-text-title').innerText = 'Generated Text';
    document.getElementById('questionnaire').innerHTML = '';
    simplemde.value(''); // Clear the SimpleMDE editor
}

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
}

// Helper function to append questions
function appendQuestion(parentDiv, question) {
    const div = document.createElement('div');
    div.classList.add('form-group', 'label-group');
    div.id = `question-${question.id}`;
    div.setAttribute('data-question-id', question.id);
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

        div.appendChild(textInput);

        textInput.addEventListener('input', () => {
            textInput.dataset.userChanged = 'true';
            generateFullText();
        });
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

    // Add event listeners to update the text on input
    const textareas = div.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', () => {
            checkConditions();
            generateFullText();
        });
    });
}

// Function to find the value from the allGroups structure
function findValue(key, groups) {
    for (const group of groups) {
        for (const question of group.questions) {
            if (question.id === key) {
                let value = '';
                const inputElement = document.querySelector(`[name="${key}"]`);

                // Check user input value
                if (inputElement && inputElement.value.trim()) {
                    return inputElement.value.trim();
                }

                // Check default_from value
                if (question.default_from) {
                    value = findValue(question.default_from, groups);
                    if (value) return value;
                }

                // Return placeholder
                return question.placeholder || '';
            }
        }

        // Recursively search in subgroups
        if (group.groups) {
            const value = findValue(key, group.groups);
            if (value) return value;
        }
    }
    return '';
}

// Function to replace tokens with actual values
function replaceTokens(text, form) {
    return text.replace(/\[([^\]]+)\]/g, (_, key) => {
        return findValue(key, allGroups) || '';
    });
}

// Function to check conditions
function checkConditions() {
    const form = document.getElementById('questionnaire');

    allGroups.forEach(group => {
        group.questions.forEach(question => {
            const questionDiv = document.getElementById(`question-${question.id}`);
            const conditions = question.conditions || [];
            if (conditions.length === 0) {
                questionDiv.style.display = 'block';
                return;
            }

            let showQuestion = conditions.every(condition => {
                const conditionInput = form.querySelector(`[name="${condition.id}"]`);
                if (conditionInput) {
                    if (conditionInput.type === 'radio' || conditionInput.type === 'checkbox') {
                        const checkedInput = form.querySelector(`[name="${condition.id}"]:checked`);
                        return checkedInput && checkedInput.value === condition.value;
                    } else {
                        return conditionInput.value.trim() === condition.value;
                    }
                }
                return false;
            });

            questionDiv.style.display = showQuestion ? 'block' : 'none';
        });
    });
}

// Generate full text including intro and outro
function generateFullText() {
    const form = document.getElementById('questionnaire');

    let text = introText ? `${replaceTokens(introText, form)}\n\n` : '';
    text += generateText(allGroups, form);
    if (outroText) {
        text += `\n\n${replaceTokens(outroText, form)}`;
    }

    simplemde.value(text); // Set the generated text in the SimpleMDE editor

    // Toggle preview mode to ensure rendering
    simplemde.togglePreview();

    // Check if the editor is in preview mode, if not toggle it to preview mode
    if (!simplemde.isPreviewActive()) {
        simplemde.togglePreview(); // First toggle to preview mode
    }
}

// Generate text based on answers
function generateText(groups, form, level = 1) {
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
                            if (value.value === "") {
                                return; // Skip processing if the none option is selected
                            }
                            const option = question.options.find(opt => opt.id === value.value);
                            if (option) {
                                if (question.pre_text) {
                                    groupText += question.pre_text;
                                }
                                let textBlock = option.text_block;
                                // Replace tokens
                                textBlock = replaceTokens(textBlock, form);
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
                        // Replace tokens
                        textBlock = replaceTokens(textBlock, form);
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
            const subGroupText = generateText(group.groups, form, level + 1);
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

// Initial call to check conditions after loading the form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('questionnaire');
    checkConditions();
    generateFullText(); // Generate initial text with default values
});
