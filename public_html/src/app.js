var ScrollListener = React.createClass({
  componentDidMount: function () {
    window.addEventListener('scroll', this.onPageScroll);
  },

  componentWillUnmount: function () {
    window.removeEventListener('scroll', this.onPageScroll);
  },
  
  onPageScroll: function () {
    var bg = document.getElementById("bg");
    var bgPos = (document.body.scrollTop);
    var height = $(document).height();
    
    if (bgPos > 50) {
      $('#scroll').addClass('scrolled');
    }
    var opacity = ( ((bgPos/height)) * -1 ) + .55;
    //console.log(opacity);
    bg.style.opacity = opacity;
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
  
  $('#hullo').mouseover(function() {
    $('#scroll').removeClass('scrolled').css('opacity','1');
  });
  
  $('#scroll, #hullo').click(function(e) {
    e.preventDefault();
    $('html, body').animate({
      scrollTop: $('#content-1').height()
    })
  });
  
  function delayScrollHint() { $('#scroll').addClass('scroll-show') }
  
  setTimeout(delayScrollHint, 1500);
  
  $('.balance-text').balanceText();
});