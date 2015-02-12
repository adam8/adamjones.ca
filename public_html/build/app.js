var CommentBox = React.createClass({displayName: "CommentBox",
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
    
    //console.log(bgPos);
    if (bgPos > 50) {
      $('#scroll').addClass('scrolled');
    }
    bg.style.opacity = (bgPos/height * 2) + 0;
    //bg.style["-webkit-transform"] = "translate3d(0," + bgPos + "px, 0)";
    //bg.style["transform"] = "translate3d(0px, " + bgPos + "px, 0)";
  },
  
  render: function() {
    return (
      React.createElement("div", {className: "content-box social"}, 
        React.createElement("a", {href: "https://dribbble.com/adamskye"}, 
          React.createElement("div", {id: "logo-dribbble"}, 
            React.createElement("svg", {version: "1.1", x: "0px", y: "0px", viewBox: "0 0 216 216", "enable-background": "new 0 0 216 216"}, 
              React.createElement("g", {id: "ball"}, 
              		React.createElement("path", {"fill-rule": "evenodd", "clip-rule": "evenodd", fill: "#FFFFFF", d: "M108,3.5C50.6,3.5,3.9,50.2,3.9,107.6" + ' ' +
              			"C3.9,165,50.6,211.7,108,211.7S212.1,165,212.1,107.6C212.1,50.2,165.4,3.5,108,3.5z M176.8,51.5c12.4,15.1,19.9,34.4,20.1,55.4" + ' ' +
              			"c-2.9-0.6-32.3-6.6-61.9-2.9c-0.6-1.5-1.3-3.1-1.9-4.6c-1.8-4.3-3.8-8.6-5.9-12.9C160,73.2,174.9,54.1,176.8,51.5z M108,18.8" + ' ' +
              			"c22.6,0,43.2,8.5,58.9,22.4c-1.6,2.3-15,20.3-46.6,32.1c-14.6-26.8-30.7-48.8-33.2-52C93.8,19.7,100.8,18.8,108,18.8z M70.2,27.3" + ' ' +
              			"c2.3,3.2,18.2,25.2,33,51.4c-41.6,11-78.2,10.9-82.2,10.8C26.7,61.9,45.3,39,70.2,27.3z M19.1,107.7c0-0.9,0-1.8,0-2.7" + ' ' +
              			"c3.9,0.1,47,0.6,91.4-12.7c2.5,5,5,10,7.2,15.1c-1.2,0.3-2.3,0.7-3.5,1.1c-45.9,14.8-70.3,55.2-72.3,58.7" + ' ' +
              			"C27.7,151.4,19.1,130.6,19.1,107.7z M108,196.6c-20.6,0-39.5-7-54.6-18.8c1.6-3.3,19.6-38,69.7-55.5c0.2-0.1,0.4-0.1,0.6-0.2" + ' ' +
              			"c12.5,32.4,17.6,59.6,19,67.4C132,194.1,120.3,196.6,108,196.6z M157.6,181.4c-0.9-5.4-5.6-31.4-17.3-63.4" + ' ' +
              			"c27.9-4.5,52.3,2.8,55.4,3.8C191.8,146.6,177.6,168,157.6,181.4z"})
              )
            )
          ), 
          "Dribbble"
        ), 
        
        
        React.createElement("a", {href: "https://github.com/adam8"}, 
          React.createElement("div", {id: "logo-github"}, 
            React.createElement("svg", {version: "1.1", x: "0px", y: "0px", viewBox: "0 0 72.4 71", "enable-background": "new 0 0 72.4 71"}, 
            React.createElement("path", {"fill-rule": "evenodd", "clip-rule": "evenodd", fill: "#FFFFFF", d: "M36.6,2.1C17.3,2.1,1.8,17.7,1.8,37c0,15.4,10,28.4,23.8,33" + ' ' +
            	"c1.7,0.3,2.4-0.8,2.4-1.7c0-0.8,0-3,0-5.9c-9.7,2.1-11.7-4.7-11.7-4.7c-1.6-4-3.9-5.1-3.9-5.1c-3.2-2.2,0.2-2.1,0.2-2.1" + ' ' +
            	"c3.5,0.2,5.3,3.6,5.3,3.6C21,59.4,26,57.9,28,57c0.3-2.2,1.2-3.8,2.2-4.7c-7.7-0.9-15.9-3.9-15.9-17.2c0-3.8,1.4-6.9,3.6-9.3" + ' ' +
            	"c-0.4-0.9-1.6-4.4,0.3-9.2c0,0,2.9-0.9,9.6,3.6c2.8-0.8,5.8-1.2,8.7-1.2c3,0,5.9,0.4,8.7,1.2c6.6-4.5,9.6-3.6,9.6-3.6" + ' ' +
            	"c1.9,4.8,0.7,8.3,0.3,9.2c2.2,2.4,3.6,5.5,3.6,9.3c0,13.4-8.1,16.3-15.9,17.2c1.3,1.1,2.4,3.2,2.4,6.4c0,4.7,0,8.4,0,9.6" + ' ' +
            	"c0,0.9,0.6,2,2.4,1.7c13.8-4.6,23.8-17.7,23.8-33C71.4,17.7,55.8,2.1,36.6,2.1z"})
            )
          ), 
          "GitHub"
        ), 
        
        
        React.createElement("a", {href: "https://www.linkedin.com/in/adamskyejones"}, 
          React.createElement("div", {id: "logo-linkedin"}, 
            React.createElement("svg", {version: "1.1", x: "0px", y: "0px", viewBox: "0 0 18 18", "enable-background": "new 0 0 18 18"}, 
            React.createElement("path", {fill: "#FFFFFF", d: "M16.7,0H1.3C0.6,0,0,0.6,0,1.3v15.4C0,17.4,0.6,18,1.3,18h15.3c0.7,0,1.3-0.6,1.3-1.3V1.3" + ' ' +
            	"C18,0.6,17.4,0,16.7,0z M5.3,15.3H2.7V6.7h2.7V15.3z M4,5.6C3.1,5.6,2.5,4.9,2.5,4c0-0.9,0.7-1.5,1.5-1.5c0.9,0,1.5,0.7,1.5,1.5" + ' ' +
            	"C5.6,4.9,4.9,5.6,4,5.6z M15.3,15.3h-2.7v-4.2c0-1,0-2.3-1.4-2.3c-1.4,0-1.6,1.1-1.6,2.2v4.2H7V6.7h2.6v1.2h0" + ' ' +
            	"c0.4-0.7,1.2-1.4,2.5-1.4c2.7,0,3.2,1.8,3.2,4.1V15.3z"})
            )
          ), 
          "LinkedIn"
        )
      )
    );
  }
  
});
React.render(
  React.createElement(CommentBox, null),
  document.getElementById('content')
);

$(function() {
  
  $('#container-outer').css('opacity','1');
  $('#scroll').click(function(e) {
    e.preventDefault();
    $('html, body').animate({
      scrollTop: $('#container-outer').height()
    })
  });
  function delayScrollHint() { $('#scroll').css('opacity','1') }
  setTimeout(delayScrollHint, 1500);
});