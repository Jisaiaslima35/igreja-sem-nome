document.addEventListener('DOMContentLoaded', () => {
    const formatarData = (dataString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const data = new Date(dataString + 'T00:00:00');
        return data.toLocaleDateString('pt-BR', options);
    };

    const loadPosts = async (limit) => {
        const postGrid = document.getElementById('postGrid');
        const latestPosts = document.getElementById('latestPosts');

        if (!postGrid && !latestPosts) return;

        try {
            const response = await fetch('./data/posts.json');
            let posts = await response.json();
            posts.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (latestPosts && limit) {
                const latest = posts.slice(0, limit);
                latestPosts.innerHTML = latest.map(post => {
                    return '<div class="post-card">' +
                        '<img src="' + post.imagem + '" alt="' + post.titulo + '" onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1504052433629-a6ef81a54d30?w=400\'">' +
                        '<div class="post-card-content">' +
                        '<span class="meta">' + post.categoria + ' • ' + formatarData(post.data) + '</span>' +
                        '<h3>' + post.titulo + '</h3>' +
                        '<p>' + post.resumo.substring(0, 250) + '...</p>' +
                        (post.link ? '<a href="' + post.link + '" target="_blank" class="btn-sm">Saiba Mais →</a>' : '') +
                        '</div></div>';
                }).join('');

                if (postGrid) {
                    const events = posts.slice(limit, limit + 3);
                    postGrid.innerHTML = events.map(post => {
                        return '<div class="card">' +
                            '<h3>' + post.titulo + '</h3>' +
                            '<p class="meta">' + formatarData(post.data) + '</p>' +
                            '<p>' + post.resumo + '</p></div>';
                    }).join('');
                }
            } else if (postGrid) {
                // Página de posts — layout blog estilo WordPress
                postGrid.innerHTML = posts.map(post => {
                    return '<div class="blog-post">' +
                        '<img src="' + post.imagem + '" alt="' + post.titulo + '" onerror="this.onerror=null;this.src=\'https://images.unsplash.com/photo-1504052433629-a6ef81a54d30?w=400\'">' +
                        '<div class="blog-post-body">' +
                        '<span class="badge">' + post.categoria + '</span>' +
                        '<h3>' + post.titulo + '</h3>' +
                        '<span class="meta">📅 ' + formatarData(post.data) + '</span>' +
                        '<p>' + post.resumo + '</p>' +
                        (post.link ? '<a href="' + post.link + '" target="_blank" class="btn-post">Saiba Mais →</a>' : '') +
                        '</div></div>';
                }).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar posts:', error);
        }
    };

    if (document.getElementById('postGrid')) {
        if (document.getElementById('latestPosts')) {
            loadPosts(6);
        } else {
            loadPosts(0);
        }
    }

    // Mural de Oração
    const oracaoForm = document.getElementById('oracao-form');
    const oracaoCardsContainer = document.querySelector('.oracao-cards');

    if (oracaoForm) {
        oracaoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const pedido = document.getElementById('pedido').value;
            if (nome && pedido) {
                const pedidos = JSON.parse(localStorage.getItem('pedidosOracao') || '[]');
                pedidos.unshift({ id: Date.now(), nome, pedido, data: new Date().toISOString() });
                localStorage.setItem('pedidosOracao', JSON.stringify(pedidos));
                oracaoForm.reset();
                renderizarPedidos();
            }
        });
    }

    const renderizarPedidos = () => {
        if (!oracaoCardsContainer) return;
        const pedidos = JSON.parse(localStorage.getItem('pedidosOracao') || '[]');
        oracaoCardsContainer.innerHTML = pedidos.map(p => {
            return '<div class="oracao-card">' +
                '<h4>' + p.nome + '</h4>' +
                '<p>' + p.pedido + '</p>' +
                '<small style="color:rgba(255,255,255,0.6)">' + formatarData(p.data.split('T')[0]) + '</small>' +
                '</div>';
        }).join('');
    };

    if (document.querySelector('.oracao-cards')) renderizarPedidos();
});
