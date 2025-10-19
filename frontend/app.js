// Global variables
let familyData = null;
let svg, g, zoom;
let width, height;
let currentLayout = 'tree';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    const fileInput = document.getElementById('fileInput');
    const uploadBox = document.getElementById('uploadBox');
    const downloadTemplate = document.getElementById('downloadTemplate');

    // File upload handling
    uploadBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // Download template
    downloadTemplate.addEventListener('click', generateTemplate);

    // Control buttons
    document.getElementById('zoomIn').addEventListener('click', () => zoomBy(1.2));
    document.getElementById('zoomOut').addEventListener('click', () => zoomBy(0.8));
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('fitView').addEventListener('click', fitToView);
    document.getElementById('layoutSelect').addEventListener('change', (e) => {
        currentLayout = e.target.value;
        if (familyData) renderFamilyTree(familyData);
    });

    document.getElementById('closeDetails').addEventListener('click', () => {
        document.getElementById('personDetails').style.display = 'none';
        document.querySelector('.overlay')?.remove();
    });

    // Initialize SVG
    initializeSVG();
}

function initializeSVG() {
    const container = document.getElementById('treeContainer');
    width = container.clientWidth;
    height = container.clientHeight;

    svg = d3.select('#familyTree')
        .attr('width', width)
        .attr('height', height);

    // Create zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    g = svg.append('g');
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
}

async function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showStatus('Please upload a CSV file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        showStatus('Processing file...', 'warning');

        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            familyData = result.data;
            showStatus(`Successfully loaded ${Object.keys(familyData.people).length} people`, 'success');
            renderFamilyTree(familyData);
            showStats(familyData);
        } else {
            showStatus('Error: ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('Error connecting to server: ' + error.message, 'error');
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function renderFamilyTree(data) {
    document.getElementById('treeContainer').style.display = 'block';

    // Clear previous rendering
    g.selectAll('*').remove();

    if (currentLayout === 'tree') {
        renderTreeLayout(data);
    } else {
        renderForceLayout(data);
    }
}

function renderTreeLayout(data) {
    // Find root nodes (people without parents)
    const rootNodes = Object.keys(data.people).filter(id => {
        const person = data.people[id];
        return !person.father_id && !person.mother_id;
    });

    if (rootNodes.length === 0) {
        showStatus('No root person found. Need at least one person without parents.', 'error');
        return;
    }

    // Build hierarchy for each root - Japanese style (top to bottom)
    const margin = { top: 80, right: 120, bottom: 80, left: 120 };
    const treeWidth = width - margin.left - margin.right;
    const treeHeight = height - margin.top - margin.bottom;

    // Vertical tree layout (top to bottom)
    const treeLayout = d3.tree()
        .size([treeWidth, treeHeight])
        .nodeSize([150, 120])  // Fixed node spacing: [width spacing, height spacing]
        .separation((a, b) => (a.parent === b.parent ? 1.5 : 2.0));

    let allNodes = [];
    let allLinks = [];

    rootNodes.forEach((rootId, index) => {
        const root = buildHierarchy(rootId, data.people);
        const treeData = d3.hierarchy(root);

        treeLayout(treeData);

        // Offset each tree horizontally
        const offset = (treeWidth / rootNodes.length) * index;

        treeData.descendants().forEach(d => {
            d.x += margin.left + offset;
            d.y += margin.top;
        });

        allNodes.push(...treeData.descendants());
        allLinks.push(...treeData.links());
    });

    // Draw parent-child links (vertical lines with horizontal connector)
    allLinks.forEach(link => {
        const source = link.source;
        const target = link.target;

        // Create path with straight lines
        const path = g.append('path')
            .attr('class', 'link parent-child')
            .attr('d', `
                M ${source.x} ${source.y}
                L ${source.x} ${(source.y + target.y) / 2}
                L ${target.x} ${(source.y + target.y) / 2}
                L ${target.x} ${target.y}
            `);
    });

    // Draw marriage links (horizontal lines between spouses)
    const marriages = new Set();
    data.relationships.filter(r => r.type === 'marriage').forEach(rel => {
        const person1 = allNodes.find(n => n.data.id === rel.from);
        const person2 = allNodes.find(n => n.data.id === rel.to);

        if (person1 && person2) {
            const key = [rel.from, rel.to].sort().join('-');
            if (!marriages.has(key)) {
                marriages.add(key);

                g.append('line')
                    .attr('class', 'link marriage')
                    .attr('x1', person1.x)
                    .attr('y1', person1.y)
                    .attr('x2', person2.x)
                    .attr('y2', person2.y)
                    .attr('stroke-width', 3);
            }
        }
    });

    // Draw nodes with Japanese-style boxes
    const node = g.selectAll('.node')
        .data(allNodes)
        .enter()
        .append('g')
        .attr('class', d => `node ${d.data.gender || ''}`)
        .attr('transform', d => `translate(${d.x},${d.y})`);

    // Box dimensions - larger to prevent text overflow
    const boxWidth = 100;
    const boxHeight = 70;

    // Draw box background
    node.append('rect')
        .attr('x', -boxWidth / 2)
        .attr('y', -boxHeight / 2)
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('class', 'person-box')
        .attr('rx', 4)  // Rounded corners
        .attr('ry', 4)
        .on('click', (event, d) => showPersonDetails(d.data));

    // Draw divider line between family name and given name
    node.append('line')
        .attr('x1', -boxWidth / 2)
        .attr('y1', 0)
        .attr('x2', boxWidth / 2)
        .attr('y2', 0)
        .attr('stroke', '#999')
        .attr('stroke-width', 1);

    // Family name (姓) - top half
    node.append('text')
        .attr('dy', -10)
        .attr('text-anchor', 'middle')
        .attr('class', 'family-name-text')
        .text(d => d.data.family_name || '姓')
        .on('click', (event, d) => showPersonDetails(d.data));

    // Given name (名) - bottom half
    node.append('text')
        .attr('dy', 20)
        .attr('text-anchor', 'middle')
        .attr('class', 'given-name-text')
        .text(d => d.data.first_name || '名')
        .on('click', (event, d) => showPersonDetails(d.data));

    // Add furigana if available (small text above box)
    node.append('text')
        .attr('dy', -boxHeight / 2 - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(d => {
            if (d.data.family_name_furigana || d.data.first_name_furigana) {
                return `${d.data.family_name_furigana || ''} ${d.data.first_name_furigana || ''}`.trim();
            }
            return '';
        });

    // Add birth-death years below box
    node.append('text')
        .attr('dy', boxHeight / 2 + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#666')
        .text(d => {
            const person = d.data;
            const birth = person.birth_date ? person.birth_date.split('-')[0] : '';
            const death = person.death_date ? person.death_date.split('-')[0] : '';
            if (birth && death) return `${birth}-${death}`;
            if (birth) return birth;
            return '';
        });
}

function renderForceLayout(data) {
    const nodes = Object.values(data.people).map(p => ({ ...p }));
    const links = [];

    // Create links from relationships
    data.relationships.forEach(rel => {
        links.push({
            source: rel.from,
            target: rel.to,
            type: rel.type
        });
    });

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(50));

    // Draw links
    const link = g.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', d => `link ${d.type}`);

    // Draw nodes
    const node = g.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', d => `node ${d.gender || ''}`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    node.append('circle')
        .attr('r', 8)
        .on('click', (event, d) => showPersonDetails(d));

    node.append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => `${d.family_name} ${d.first_name}`)
        .on('click', (event, d) => showPersonDetails(d));

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

function buildHierarchy(personId, people) {
    const person = people[personId];
    if (!person) return null;

    const node = { ...person };

    // Add children
    const children = Object.values(people).filter(p =>
        p.father_id === personId || p.mother_id === personId
    );

    if (children.length > 0) {
        node.children = children.map(child => buildHierarchy(child.id, people));
    }

    return node;
}

function showPersonDetails(person) {
    const detailsDiv = document.getElementById('personDetails');
    const contentDiv = document.getElementById('detailsContent');

    const fields = [
        { label: 'Full Name', value: `${person.family_name} ${person.first_name}` },
        { label: 'Furigana', value: `${person.family_name_furigana} ${person.first_name_furigana}` },
        { label: 'Gender', value: person.gender || 'Not specified' },
        { label: 'Birth Date', value: person.birth_date || 'Unknown' },
        { label: 'Death Date', value: person.death_date || 'Living' },
        { label: 'Birth Place', value: person.birth_place || 'Unknown' },
        { label: 'Death Place', value: person.death_place || '-' },
        { label: 'Occupation', value: person.occupation || 'Unknown' },
        { label: 'Notes', value: person.notes || '-' }
    ];

    let html = `<h2>${person.family_name} ${person.first_name}</h2>`;

    fields.forEach(field => {
        if (field.value && field.value !== 'Unknown' && field.value !== '-') {
            html += `
                <div class="detail-row">
                    <div class="detail-label">${field.label}:</div>
                    <div class="detail-value">${field.value}</div>
                </div>
            `;
        }
    });

    contentDiv.innerHTML = html;
    detailsDiv.style.display = 'block';

    // Add overlay
    if (!document.querySelector('.overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'overlay show';
        overlay.onclick = () => {
            detailsDiv.style.display = 'none';
            overlay.remove();
        };
        document.body.appendChild(overlay);
    }
}

function showStats(data) {
    const statsDiv = document.getElementById('stats');
    const contentDiv = document.getElementById('statsContent');

    const totalPeople = Object.keys(data.people).length;
    const males = Object.values(data.people).filter(p => p.gender === 'male').length;
    const females = Object.values(data.people).filter(p => p.gender === 'female').length;
    const marriages = data.relationships.filter(r => r.type === 'marriage').length;
    const living = Object.values(data.people).filter(p => !p.death_date).length;

    const stats = [
        { label: 'Total People', value: totalPeople },
        { label: 'Males', value: males },
        { label: 'Females', value: females },
        { label: 'Marriages', value: marriages },
        { label: 'Living', value: living },
        { label: 'Deceased', value: totalPeople - living }
    ];

    let html = '';
    stats.forEach(stat => {
        html += `
            <div class="stat-item">
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
            </div>
        `;
    });

    contentDiv.innerHTML = html;
    statsDiv.style.display = 'block';
}

function zoomBy(factor) {
    svg.transition().call(zoom.scaleBy, factor);
}

function resetView() {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
}

function fitToView() {
    const bounds = g.node().getBBox();
    const fullWidth = width;
    const fullHeight = height;
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;

    if (bounds.width === 0 || bounds.height === 0) return;

    const scale = 0.9 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    svg.transition().call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
}

function generateTemplate() {
    const headers = [
        'id',
        'first_name',
        'family_name',
        'first_name_furigana',
        'family_name_furigana',
        'birth_date',
        'death_date',
        'gender',
        'married_with',
        'birth_place',
        'death_place',
        'occupation',
        'notes',
        'father_id',
        'mother_id',
        'child_id1',
        'child_id2',
        'child_id3'
    ];

    const examples = [
        ['person1', 'Taro', 'Yamada', 'タロウ', 'ヤマダ', '1950-01-15', '', 'male', 'person2', 'Tokyo', '', 'Engineer', 'Founder of the family business', '', '', 'person3', 'person4', ''],
        ['person2', 'Hanako', 'Sato', 'ハナコ', 'サトウ', '1952-03-20', '', 'female', 'person1', 'Osaka', '', 'Teacher', '', '', '', '', '', ''],
        ['person3', 'Ichiro', 'Yamada', 'イチロウ', 'ヤマダ', '1975-06-10', '', 'male', 'person5', 'Tokyo', '', 'Doctor', '', 'person1', 'person2', 'person6', '', ''],
        ['person4', 'Yuki', 'Yamada', 'ユキ', 'ヤマダ', '1978-09-25', '', 'female', '', 'Tokyo', '', 'Artist', '', 'person1', 'person2', '', '', ''],
        ['person5', 'Sakura', 'Tanaka', 'サクラ', 'タナカ', '1977-12-05', '', 'female', 'person3', 'Kyoto', '', 'Lawyer', '', '', '', '', '', ''],
        ['person6', 'Ken', 'Yamada', 'ケン', 'ヤマダ', '2000-04-12', '', 'male', '', 'Tokyo', '', 'Student', '', 'person3', 'person5', '', '', '']
    ];

    let csv = headers.join(',') + '\n';
    examples.forEach(row => {
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family_tree_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}
