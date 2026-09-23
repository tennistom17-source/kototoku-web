// Add each official social profile URL here. Leave a value blank to hide that service.
var KOTOTOKU_SOCIAL_LINKS = [
  { name: 'Instagram', url: 'https://www.instagram.com/kototoku17/', icon: 'instagram' },
  { name: 'Threads', url: 'https://www.threads.com/@kototoku17?hl=ja', icon: 'threads' },
  { name: 'note', url: 'https://note.com/firm_broom4032', icon: 'note' },
  { name: 'X', url: 'https://x.com/kototoku123', icon: 'x' }
];

(function(){
  var socialIcons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle class="social-icon-dot" cx="17.5" cy="6.5" r="1"></circle></svg>',
    threads: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z"></path></svg>',
    note: '<img src="images/icon/note-brand.png" alt="" width="36" height="36" aria-hidden="true">',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"></path></svg>'
  };

  function getSocialLinks(){
    return KOTOTOKU_SOCIAL_LINKS.filter(function(link){ return link.url.trim(); });
  }

  function createSocialLinks(className){
    var links = getSocialLinks();
    if (!links.length) return null;

    var list = document.createElement('div');
    list.className = className;
    links.forEach(function(link){
      var anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('aria-label', link.name + 'を新しいタブで開く');
      anchor.title = link.name + 'を新しいタブで開く';
      anchor.className = 'social-link social-link-' + link.icon;
      anchor.innerHTML = socialIcons[link.icon];
      list.appendChild(anchor);
    });
    return list;
  }

  function addSocialLinks(){
    if (!getSocialLinks().length) return;

    var indexHeader = document.querySelector('.home-index .index-header');
    if (indexHeader) {
      var follow = document.createElement('section');
      follow.className = 'social-follow';
      follow.setAttribute('aria-labelledby', 'social-follow-title');
      follow.innerHTML = '<div class="wrap"><div><h2 id="social-follow-title">コトトクをフォロー</h2><p>無料ツールの追加や、AIを使った小さな工夫を発信しています。</p></div></div>';
      follow.querySelector('.wrap').appendChild(createSocialLinks('social-links social-links-follow'));
      indexHeader.insertAdjacentElement('afterend', follow);
    }

    document.querySelectorAll('footer').forEach(function(footer){
      var footerBottom = footer.querySelector('.footer-bottom');
      var social = document.createElement('div');
      social.className = footerBottom ? 'wrap footer-social' : 'footer-social compact-footer-social';
      social.setAttribute('aria-label', 'コトトクのSNS');
      social.appendChild(createSocialLinks('social-links social-links-footer'));
      if (footerBottom) {
        footer.insertBefore(social, footerBottom);
      } else {
        footer.appendChild(social);
      }
    });
  }

  addSocialLinks();
  var button=document.querySelector('.menu');
  var navigation=document.querySelector('.navlinks');
  function setMenu(open){
    navigation.classList.toggle('open',open);
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
  }
  if(button&&navigation){
    button.closest('nav').classList.add('menu-ready');
    button.addEventListener('click',function(){setMenu(!navigation.classList.contains('open'));});
    navigation.addEventListener('click',function(event){
      if(event.target.closest('a')){setMenu(false);}
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&navigation.classList.contains('open')){
        setMenu(false);
        button.focus();
      }
    });
    matchMedia('(max-width:760px)').addEventListener('change',function(){setMenu(false);});
  }
  var video=document.getElementById('intro-video');
  var error=document.getElementById('film-error');
  if(video&&error){
    function showVideoError(){error.hidden=false;}
    video.addEventListener('error',showVideoError);
    video.querySelector('source').addEventListener('error',showVideoError);
  }
})();