var CommentBox = React.createClass({displayName: "CommentBox",
  componentDidMount: function () {
    window.addEventListener('scroll', this.onPageScroll);
  },

  componentWillUnmount: function () {
    window.removeEventListener('scroll', this.onPageScroll);
  },
  
  onPageScroll: function () {
    var bg = document.getElementById("bg");
    var bgPos = (document.body.scrollTop / 10) * -1;
    bg.style["-webkit-transform"] = "translate3d(0," + bgPos + "px, 0)";
    bg.style["transform"] = "translate3d(0px, " + bgPos + "px, 0)";
  },
  
  render: function() {
    return (
      React.createElement("div", {className: "content-box"}, 
        React.createElement("div", null, React.createElement("a", {href: "https://dribbble.com/adamskye"}, "Dribbble")), 
        React.createElement("div", null, React.createElement("a", {href: "https://github.com/adam8"}, "GitHub")), 
        React.createElement("div", null, React.createElement("a", {href: "https://www.linkedin.com/in/adamskyejones"}, "LinkedIn"))
      )
    );
  }
  
});
React.render(
  React.createElement(CommentBox, null),
  document.getElementById('content')
);