var ScrollListener = React.createClass({displayName: "ScrollListener",
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
    var height = $(document).height();
    
    if (bgPos > (height/2) - 100) {
      bg.pause();
      console.log('stop');
    } else {
      bg.play();
      console.log('start');
    }
    var opacity = ( ((bgPos/height * 2) ) * -1 ) + 1;
    bg.style.opacity = opacity;
  },

  render: function() {
    return false;
  }
  
});
React.render(
  React.createElement(ScrollListener, null),
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
      // first line takes longer
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset 1s ease-in-out';
    } else if (i == 1) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .5s ease-in-out';
      path.style.transitionDelay = path.style.WebkitTransitionDelay = i + 's';
    } else if (i > 3) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .2s ease-in-out';
      path.style.transitionDelay = path.style.WebkitTransitionDelay = (i/4 + .2) + 's';
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
      // first line takes longer
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .5s ease-in-out';
      path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + 's';
    } else if (i == 1) {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .1s ease-in-out';
      path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + .3 + 's';
    } else {
      path.style.transition = path.style.WebkitTransition = 'stroke-dashoffset .1s ease-in-out';
      path.style.transitionDelay = path.style.WebkitTransitionDelay = initDelay + .4 + 's';
    }
    // Go!
    path.style.strokeDashoffset = '0';
  }
  
  
});