(function(){
  var button=document.querySelector('.menu');
  var navigation=document.querySelector('.navlinks');
  function setMenu(open){
    navigation.classList.toggle('open',open);
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
  }
  if(button&&navigation){
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