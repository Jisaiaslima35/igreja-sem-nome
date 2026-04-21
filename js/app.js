/*
  Este arquivo contém as funcionalidades JavaScript interativas do site.
  Edite este arquivo para adicionar ou modificar o comportamento dinâmico.
*/

document.addEventListener('DOMContentLoaded', () => {
    // Função para formatar data em português
    const formatarData = (dataString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const data = new Date(dataString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        return data.toLocaleDateString('pt-BR', options);
    };

    // Função para carregar posts (usada em index.html e posts.html)
    const loadPosts = async (limit = 0) => {
        const postsGrid = document.querySelector('.post-grid');
        if (!postsGrid) return;

        try {
            const response = await fetch('./data/posts.json');
            let posts = await response.json();

            // Ordena os posts por data, do mais recente para o mais antigo
            posts.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (limit > 0) {
                posts = posts.slice(0, limit);
            }

            postsGrid.innerHTML = ''; // Limpa o conteúdo existente

            posts.forEach(post => {
                const postCard = document.createElement('div');
                postCard.classList.add('post-card');
                postCard.innerHTML = `
                    <img src="${post.imagem}" alt="${post.titulo}">
                    <div class="post-card-content">
                        <h3>${post.titulo}</h3>
                        <p class="post-meta">Data: ${formatarData(post.data)}</p>
                        <p>${post.resumo}</p>
                        <a href="#" class="btn btn-outline">Ver mais</a>
                    </div>
                `;
                postsGrid.appendChild(postCard);
            });
        } catch (error) {
            console.error('Erro ao carregar posts:', error);
            postsGrid.innerHTML = '<p>Não foi possível carregar os posts no momento. Tente novamente mais tarde.</p>';
        }
    };

    // Menu Hamburguer
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mainNav = document.querySelector('.main-nav');

    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            mainNav.classList.toggle('active');
        });
    }

    // Funções para Mural de Oração (oracao.html)
    const oracaoForm = document.getElementById('oracao-form');
    const oracaoCardsContainer = document.querySelector('.oracao-cards');
    const clearPrayersBtn = document.getElementById('clear-prayers-btn');

    const salvarPedido = (nome, pedido) => {
        const pedidos = JSON.parse(localStorage.getItem('pedidosOracao')) || [];
        const novoPedido = {
            id: Date.now(),
            nome: nome,
            pedido: pedido,
            data: new Date().toISOString()
        };
        pedidos.push(novoPedido);
        localStorage.setItem('pedidosOracao', JSON.stringify(pedidos));
        renderizarPedidos();
    };

    const renderizarPedidos = () => {
        if (!oracaoCardsContainer) return;

        const pedidos = JSON.parse(localStorage.getItem('pedidosOracao')) || [];
        // Exibir os mais recentes primeiro
        pedidos.sort((a, b) => new Date(b.data) - new Date(a.data));

        oracaoCardsContainer.innerHTML = '';
        pedidos.forEach(p => {
            const oracaoCard = document.createElement('div');
            oracaoCard.classList.add('oracao-card');
            oracaoCard.innerHTML = `
                <h4>${p.nome}</h4>
                <p>${p.pedido}</p>
                <p class="oracao-meta">${formatarData(p.data.split('T')[0])} às ${new Date(p.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            `;
            oracaoCardsContainer.appendChild(oracaoCard);
        });
    };

    const limparPedidos = () => {
        const senha = prompt('Por favor, digite a senha para limpar os pedidos de oração:');
        if (senha === 'admin123') {
            if (confirm('Tem certeza que deseja limpar TODOS os pedidos de oração? Esta ação é irreversível.')) {
                localStorage.removeItem('pedidosOracao');
                renderizarPedidos();
                alert('Pedidos de oração limpos com sucesso!');
            }
        } else if (senha !== null) {
            alert('Senha incorreta!');
        }
    };

    if (oracaoForm) {
        oracaoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const pedido = document.getElementById('pedido').value;

            if (nome && pedido) {
                salvarPedido(nome, pedido);
                oracaoForm.reset();
            } else {
                alert('Por favor, preencha todos os campos.');
            }
        });
    }

    if (clearPrayersBtn) {
        clearPrayersBtn.addEventListener('click', limparPedidos);
    }

    // Inicialização para páginas específicas
    if (document.body.classList.contains('home-page')) {
        loadPosts(3); // Carrega os 3 posts mais recentes para a página inicial
    } else if (document.body.classList.contains('posts-page')) {
        loadPosts(); // Carrega todos os posts para a página de eventos
    } else if (document.body.classList.contains('oracao-page')) {
        renderizarPedidos();
    }

    // Animações de entrada (usando Intersection Observer)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.post-card, .oracao-card, .content-section').forEach(element => {
        element.style.opacity = 0; // Garante que estejam invisíveis antes da animação
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.7s ease-out, transform 0.7s ease-out';
        observer.observe(element);
    });

    // Adiciona classe para elementos animados quando visíveis
    const style = document.createElement('style');
    style.innerHTML = `
        .animated {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});
