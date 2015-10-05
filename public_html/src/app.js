var ScrollListener = React.createClass({
  componentDidMount: function () {
    window.addEventListener('scroll', this.onPageScroll);
  },

  componentWillUnmount: function () {
    window.removeEventListener('scroll', this.onPageScroll);
  },
  
  onPageScroll: function () {
    var bg = document.getElementById("bg");
    var bgPos = document.body.scrollTop;
    var screenHeight = window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight||0;;
    var docHeight = $(document).height();
    
    function getProgress(min, max, num, screen) {
      var low = min - screen;
      var high = max;
      var percent = (num - low) / (high - low);
      return percent;
    }
    

    var iconProgress = getProgress(screenHeight, (screenHeight/2), bgPos, screenHeight);
    iconProgress > 1 ? iconProgress = 1 : null;
    var iconOffset1 = 1 - getProgress(screenHeight+(screenHeight/5), (screenHeight/2), bgPos, screenHeight);
    var iconOffset2 = 1 - getProgress(screenHeight+(screenHeight/4.5), (screenHeight/2), bgPos, screenHeight);
    var iconOffset3 = 1 - getProgress(screenHeight+(screenHeight/4), (screenHeight/2), bgPos, screenHeight);
    var iconOffset4 = 1 - getProgress(screenHeight+(screenHeight/3.5), (screenHeight/2), bgPos, screenHeight);
    
    var ctaProgress = getProgress( (screenHeight*1.5), $( document ).height() - screenHeight, bgPos, screenHeight);
    
    console.log('ctaProgress',ctaProgress);
    
    
    console.log('iconProgress',iconProgress);
    console.log('bgPos',bgPos);
    

    (iconOffset1 > 1) ? iconOffset1 = 1 : null;
    (iconOffset2 > 1) ? iconOffset2 = 1 : null;
    (iconOffset3 > 1) ? iconOffset3 = 1 : null;
    (iconOffset4 > 1) ? iconOffset4 = 1 : null;
    (iconOffset1 < 0) ? iconOffset1 = 0 : null;
    (iconOffset2 < 0) ? iconOffset2 = 0 : null;
    (iconOffset3 < 0) ? iconOffset3 = 0 : null;
    (iconOffset4 < 0) ? iconOffset4 = 0 : null;
    
    $('#icon-developer').css({'opacity': (1-iconProgress) + '','-ms-transform': 'translate3d(' + iconProgress * -260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#icon-developer').css({'opacity': (1-iconProgress) + '','-webkit-transform': 'translate3d(' + iconProgress * -260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#icon-developer').css({'opacity': (1-iconProgress) + '','transform': 'translate3d(' + iconProgress * -260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    
    $('#job-title-developer').css({'opacity': (1-iconProgress) + '','-ms-transform': 'translate3d(' + iconProgress * -360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    $('#job-title-developer').css({'opacity': (1-iconProgress) + '','-webkit-transform': 'translate3d(' + iconProgress * -360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    $('#job-title-developer').css({'opacity': (1-iconProgress) + '','transform': 'translate3d(' + iconProgress * -360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    
    $('#icon-designer').css({'opacity': (1-iconProgress) + '','-ms-transform': 'translate3d(' + iconProgress * 360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    $('#icon-designer').css({'opacity': (1-iconProgress) + '','-webkit-transform': 'translate3d(' + iconProgress * 360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    $('#icon-designer').css({'opacity': (1-iconProgress) + '','transform': 'translate3d(' + iconProgress * 360 + 'px, ' + iconProgress * -100 + 'px, 0)'});
    
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','-ms-transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','-webkit-transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','-ms-transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','-webkit-transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    $('#job-title-designer').css({'opacity': (1-iconProgress) + '','transform': 'translate3d(' + iconProgress * 260 + 'px, ' + iconProgress * -260 + 'px, 0)'});
    
    

      console.log('ctaProgress',1-ctaProgress);
      var ctaProgressReverse = 1 - ctaProgress;
      $('#logo-dribbble').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(' + ctaProgressReverse * -220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});
      $('#logo-dribbble').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(' + ctaProgressReverse * -220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});
      $('#logo-dribbble').css({'opacity': ctaProgress + '','transform': 'translate3d(' + ctaProgressReverse * -220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});

      $('#social-title-dribbble').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(' + ctaProgressReverse * -230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});
      $('#social-title-dribbble').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(' + ctaProgressReverse * -230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});
      $('#social-title-dribbble').css({'opacity': ctaProgress + '','transform': 'translate3d(' + ctaProgressReverse * -230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});

      $('#logo-linkedin').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(' + ctaProgressReverse * 220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});
      $('#logo-linkedin').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(' + ctaProgressReverse * 220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});
      $('#logo-linkedin').css({'opacity': ctaProgress + '','transform': 'translate3d(' + ctaProgressReverse * 220 + 'px, ' + ctaProgressReverse * 130 + 'px, 0)'});

      $('#social-title-linkedin').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(' + ctaProgressReverse * 230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});
      $('#social-title-linkedin').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(' + ctaProgressReverse * 230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});
      $('#social-title-linkedin').css({'opacity': ctaProgress + '','transform': 'translate3d(' + ctaProgressReverse * 230 + 'px, ' + ctaProgressReverse * 190 + 'px, 0)'});

      $('#logo-github').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(0px, ' + ctaProgressReverse * 180 + 'px, 0)'});
      $('#logo-github').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(0px, ' + ctaProgressReverse * 180 + 'px, 0)'});
      $('#logo-github').css({'opacity': ctaProgress + '','transform': 'translate3d(0px, ' + ctaProgressReverse * 180 + 'px, 0)'});

      $('#social-title-github').css({'opacity': ctaProgress + '','-ms-transform': 'translate3d(0px, ' + ctaProgressReverse * 260 + 'px, 0)'});
      $('#social-title-github').css({'opacity': ctaProgress + '','-webkit-transform': 'translate3d(0px, ' + ctaProgressReverse * 260 + 'px, 0)'});
      $('#social-title-github').css({'opacity': ctaProgress + '','transform': 'translate3d(0px, ' + ctaProgressReverse * 260 + 'px, 0)'});

    
    
    
    


    
    if (bgPos > (docHeight/2) - (screenHeight/2)) {
      //bg.pause();
      $('#cloud').addClass('active');
      $('#feet').removeClass('active');
      console.log('stop');
    } else {
      //bg.play();
      $('#cloud').removeClass('active');
      $('#feet').addClass('active');
      console.log('start');
    }
    // var opacity = ( ((bgPos/docHeight * 2) ) * -1 ) + 1;
    //bg.style.opacity = opacity;
    
  },

  render: function() {
    return false;
  }
  
});
React.render(
  <ScrollListener />,
  document.getElementById('reactjs')
);





$(function() {
  
  $('#content-1').css('opacity','1');
  
  // $('#hullo').mouseover(function() {
  //   $('#scroll').removeClass('scrolled').css('opacity','1');
  // });
  
  /*
  $( "#hullo" ).hover(
    function() {
      $('#scroll').removeClass('scrolled').css('opacity','1');
    },
    function() {
      $('#scroll').addClass('scrolled');
    }
  );
  */
  
  $('#scroll, #hullo').click(function(e) {
    e.preventDefault();
    $('html, body').animate({
      scrollTop: $('#content-1').height()
    })
  });
  
  // function delayScrollHint() { $('#scroll').addClass('scroll-show') }
  
  // setTimeout(delayScrollHint, 3500);
  
  $('.balance-text').balanceText();
  
  
  $('#job-title-developer, #job-title-designer').addClass('fadeIn');
  

  var pathArrayCode = [ 'path1', 'path2', 'path3', 'path4', 'path5', 'path6', 'path7', 'path8' ];
  var pathArrayCreativity = [ 'path-creativity-1', 'path-creativity-2', 'path-creativity-3', 'path-creativity-4', 'path-creativity-5', 'path-creativity-6', 'path-creativity-7' ];

  // Draw Developer Icon
  for (var i = 0; i < pathArrayCode.length; i++) {
    var path = document.getElementById(pathArrayCode[i]);
    var length = path.getTotalLength();
    // Clear any previous transition
    path.style.transition = path.style.WebkitTransition = 'none';
    // Set up the starting positions
    path.style.strokeDasharray = path.getTotalLength() + ' ' + path.getTotalLength();
    path.style.strokeDashoffset = path.getTotalLength();
    // Trigger a layout so styles are calculated & the browser picks up the starting position before animating
    path.getBoundingClientRect();
    // Define our transition
    if (i == '0') {
      // first line takes a tad longer
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset 1s ease-in-out';
    } else if (i == 1) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .5s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = i + 's';
    } else if (i > 3) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .2s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = (i/4 + .2) + 's';
    }  else {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .5s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = (i/4 + .5) + 's';
    }
    // Go!
    path.style.strokeDashoffset = '0';
  }

  // Draw Designer Icon
  for (var i = 0; i < pathArrayCreativity.length; i++) {
    var path = document.getElementById(pathArrayCreativity[i]);
    var length = path.getTotalLength();
    // Clear any previous transition
    path.style.transition = path.style.WebkitTransition = 'none';
    // Set up the starting positions
    path.style.strokeDasharray = path.getTotalLength() + ' ' + path.getTotalLength();
    path.style.strokeDashoffset = path.getTotalLength();
    // Trigger a layout so styles are calculated & the browser picks up the starting position before animating
    path.getBoundingClientRect();
    // Define our transition
    var initDelay = 2;
    if (i == '0') {
      // first line takes a wee bit longer
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .5s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + 's';
    } else if (i == 1) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .1s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + .3 + 's';
    } else {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .1s ease-in-out';
      //path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + .4 + 's';
    }
    // Go!
    path.style.strokeDashoffset = '0';
  }
  
  
  
  //iOS full screen hack... because of bottom bar.
  function iOS() {
    var iDevices = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod' 
    ];
    while (iDevices.length) {
      if (navigator.platform === iDevices.pop()){ return true; }
    }
    return false;
  }
  //console.log('iOS?:', iOS());
  if (iOS() == true) {
    $('#content-1').addClass('iOS');
  }
  
  
});